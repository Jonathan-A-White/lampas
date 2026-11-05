import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// A miss in a short drill is a miss before (mw-74h98vg.3, docs/grammar.md 'Confirming a missed idea'): he misses a whole short drill of Your drill plan, finishes it, and gets the same drill right
// on the repeat; the idea is then marked to confirm. The questions are the same each time (Math.random is held still while the drills open, as the Drill it specs fix a walk's seed),
// so what the first run showed to be right is known for the next. At 390x844.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const random = Math.random;
    Math.random = () => ((window as unknown as { __fixed?: number }).__fixed ?? random());
  });
});

/** Rows put into, or taken out of, the app's own IndexedDB behind its back. */
async function idb(page: Page, work: { put?: { store: 'settings' | 'grammarLevels'; rows: object[] }; del?: { store: 'settings'; keys: string[] }; wipeGrammarRows?: boolean }) {
  await page.evaluate(
    (w) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const stores = ['settings', 'grammarLevels', 'reviews'];
          const tx = db.transaction(stores, 'readwrite');
          for (const row of w.put?.rows ?? []) tx.objectStore(w.put!.store).put(row);
          for (const key of w.del?.keys ?? []) tx.objectStore('settings').delete(key);
          if (w.wipeGrammarRows) {
            tx.objectStore('reviews').openCursor().onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
              if (!cursor) return;
              if ((cursor.value as { kind: string }).kind === 'grammar') cursor.delete();
              cursor.continue();
            };
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    work,
  );
}

/** The settings value under a key, or null. */
async function setting(page: Page, key: string): Promise<string | null> {
  return page.evaluate(
    (k) =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get(k);
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result ? (get.result.value as string) : null);
          };
        };
      }),
    key,
  );
}

const IDEA = 'case-genitive';

/** Plays the open short drill to its Done. `answer` is given the question's options and the right answers learned so far, and picks the option to tap. */
async function playShortDrill(page: Page, know: Map<string, string>, answer: (options: string[], right: string | undefined) => string): Promise<number> {
  const short = page.getByRole('dialog', { name: 'Short drill' });
  await expect(short).toBeVisible();
  let misses = 0;
  for (;;) {
    await expect(short.getByTestId('grammar-prompt')).toBeVisible();
    const prompt = await short.getByTestId('grammar-prompt').innerText();
    const options = await short.locator('[data-option]').allInnerTexts();
    const sig = `${prompt}||${[...options].sort().join('|')}`;
    const pick = answer(options, know.get(sig));
    await page.waitForTimeout(150);
    await short.locator('[data-option]').filter({ hasText: new RegExp(`^${pick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
    await expect(short.getByTestId('plan-drill-next')).toBeVisible();
    const right = await short.locator('[data-option][data-result="right"]').first().innerText();
    know.set(sig, right);
    if (right !== pick) misses += 1;
    const label = await short.getByTestId('plan-drill-next').textContent();
    await short.getByTestId('plan-drill-next').click();
    if (label === 'Finish') break;
  }
  await expect(short.getByTestId('plan-drill-result')).toBeVisible();
  await page.waitForTimeout(400);
  await short.getByTestId('plan-drill-done').click();
  await expect(short).toHaveCount(0);
  return misses;
}

test('a short drill he misses, then gets right on the repeat, marks the idea to confirm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await idb(page, { put: { store: 'settings', rows: [{ key: 'goal', value: '1 John 1' }] } });
  await idb(page, { put: { store: 'grammarLevels', rows: ['breathings', 'accents', 'iota-subscript', 'noun', 'case-nominative'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })) } });
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The genitive case', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await page.waitForTimeout(500);

  // Drill it, the first answer each time, to the result and Your drill plan
  await page.evaluate(() => ((window as unknown as { __fixed?: number }).__fixed = 0.3));
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  for (;;) {
    const over = await Promise.race([drill.getByTestId('grammar-prompt').waitFor().then(() => false), drill.getByTestId('drill-result').waitFor().then(() => true)]);
    if (over) break;
    await page.waitForTimeout(200);
    await drill.locator('[data-option]:not(:disabled)').first().click();
    await expect(drill.getByTestId('drill-next')).toBeVisible();
    await drill.getByTestId('drill-next').click();
    await expect(drill.getByTestId('drill-next')).toHaveCount(0);
  }
  const start = drill.getByRole('button', { name: 'Start the first drill' });
  await expect(start).toBeVisible();

  // a first look at the short drill: what is right is learned, whatever he answers
  const know = new Map<string, string>();
  await start.click();
  await playShortDrill(page, know, (options) => options[0]);
  await expect(start).toBeVisible();

  // the phone as it was before he met the idea in a drill: no marks, no rows
  await idb(page, { del: { store: 'settings', keys: ['toConfirm', 'confirmed', 'drillMissed'] }, wipeGrammarRows: true });
  expect(await setting(page, 'toConfirm')).toBeNull();

  // the drill, every answer a miss: it is not done, and nothing was right, so nothing is marked
  await start.click();
  const misses = await playShortDrill(page, know, (options, right) => options.find((o) => o !== right) ?? options[0]);
  expect(misses).toBeGreaterThanOrEqual(4);
  expect(await setting(page, 'toConfirm')).toBeNull();
  await expect(start).toBeVisible();

  // the repeat, every answer right: the idea was missed before, so it is marked to confirm
  await start.click();
  expect(await playShortDrill(page, know, (options, right) => right ?? options[0])).toBe(0);
  await expect.poll(async () => (await setting(page, 'toConfirm')) ?? '').toContain(IDEA);
  await shot(page, 'short-drill-confirm');
});
