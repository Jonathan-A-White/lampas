// tests/e2e/memorize-today.spec.ts — Today's Memorize piece (mw-fu7dqf.10) at 390x844: a memorized verse that is due, the piece 'Memorize: 1 verse due' on Today, and a tap landing on
// that verse's session. The Today chip counts the piece. Today left open past his local midnight (mw-indx1x6.58): the page clock moves 26 hours and the page is hidden, then shown;
// no row keeps yesterday's 'N of M done today' and no reload is made.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openToday, todayChip } from './today-chip';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** One memorized verse, Romans 8:28 in English, step 0 and due now. */
async function seedDueVerse(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('reviews', 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: 'en:Rom.8.28', step: 0, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('Today holds the Memorize piece for a due verse, and a tap starts its session', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seedDueVerse(page);
  await page.reload();
  await expect(todayChip(page)).toBeVisible();

  await openToday(page);
  const piece = page.getByRole('region', { name: 'Memorize', exact: true });
  const line = piece.getByRole('button', { name: /Memorize: 1 verse due/ });
  await expect(line).toBeVisible();
  await expect(piece.getByRole('checkbox', { name: 'Done: Memorize' })).toBeVisible();
  const size = await line.boundingBox();
  expect(size?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'memorize-today');

  await line.click();
  await expect(page).toHaveURL(/#\/memorize\/Rom\.8\.28\/en$/);
  await expect(page.getByText('Romans 8:28').first()).toBeVisible();
  await shot(page, 'memorize-today-session');
});

const HOURS_26 = '26:00:00';

/** Puts rows in a store of the app's database through raw IndexedDB, as the app wrote them. */
async function putRows(page: Page, store: string, rows: object[]): Promise<void> {
  await page.evaluate(
    ({ name, list }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(name, 'readwrite');
          for (const row of list) tx.objectStore(name).put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { name: store, list: rows },
  );
}

/** Two memorized verses: Romans 8:28 answered a moment ago (not due for three days) and John 3:16 due now. */
async function seedTwoVerses(page: Page): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  await putRows(page, 'reviews', [
    { kind: 'verse', id: 'en:Rom.8.28', step: 2, due: now + 3 * 86_400_000, lastWhen: now, lapses: 0, rights: 1, recent: [{ when: now, right: true }] },
    { kind: 'verse', id: 'en:John.3.16', step: 0, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 },
  ]);
}

/** The phone left on Today overnight: the clock moves `by` on, the page is hidden, then shown and focused again. No reload. */
async function overnight(page: Page, by: string): Promise<void> {
  const set = (state: 'hidden' | 'visible') =>
    page.evaluate((s) => {
      Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
      Object.defineProperty(document, 'hidden', { value: s === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await set('hidden');
  await page.clock.fastForward(by);
  await set('visible');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

test('Today left open past midnight reads the new day: the Memorize row loses yesterday\'s progress without a reload', async ({ page }) => {
  await page.clock.install();
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seedTwoVerses(page);
  await page.reload();
  await expect(todayChip(page)).toBeVisible();

  await openToday(page);
  const piece = page.getByRole('region', { name: 'Memorize', exact: true });
  await expect(piece.getByRole('button', { name: /Memorize: 1 of 2 done today · 1 due/ })).toBeVisible();
  await expect(piece.getByRole('progressbar')).toHaveCount(1);

  await overnight(page, HOURS_26);
  await expect(piece.getByRole('button', { name: /Memorize: 1 verse due/ })).toBeVisible();
  await expect(piece.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText(/done today/)).toHaveCount(0);
  await shot(page, 'memorize-today-next-day');
});

test('sweep: every Today row that reads a day\'s figure is read again after 26 hours, none keeps yesterday\'s', async ({ page }) => {
  await page.clock.install();
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  // the first open of Today seeds the schedule of his words; back on the Reader, a raw write then stands until the reload below
  await openToday(page);
  await expect(page.getByRole('region', { name: 'Review', exact: true }).getByRole('button', { name: /^[1-9]\d* due/ })).toBeVisible();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(todayChip(page)).toBeVisible();
  // the reading plan: Genesis 1 marked read on his local today
  const date = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await putRows(page, 'settings', [
    { key: 'readingPlan', value: 'on' },
    { key: 'readingPlanState', value: JSON.stringify({ planId: 'whole-bible', start: { code: 'gen', chapter: 1 }, done: ['gen.1'], doneOn: { 'gen.1': date } }) },
  ]);
  await seedTwoVerses(page);
  // Review: one of his words answered a moment ago and not due for days
  const now = await page.evaluate(() => Date.now());
  await page.evaluate(
    (at) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('reviews', 'readwrite');
          const store = tx.objectStore('reviews');
          const all = store.getAll();
          all.onsuccess = () => {
            const row = all.result.find((r) => r.kind !== 'verse' && r.due <= at);
            store.put({ ...row, step: 2, due: at + 3 * 86_400_000, lastWhen: at, recent: [{ when: at, right: true }] });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    now,
  );
  await page.reload();
  await openToday(page);
  const review = page.getByRole('region', { name: 'Review', exact: true });
  await expect(review.getByRole('button', { name: /1 of \d+ done today/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Memorize', exact: true }).getByRole('button', { name: /1 of 2 done today/ })).toBeVisible();
  await expect(page.getByTestId('plan-read-today')).toBeVisible();

  await overnight(page, HOURS_26);
  await expect(review.getByRole('button', { name: /^[1-9]\d* due/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Memorize', exact: true }).getByRole('button', { name: /Memorize: 1 verse due/ })).toBeVisible();
  await expect(page.getByTestId('plan-read-today')).toHaveCount(0);
  await expect(page.getByText(/done today/)).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});
