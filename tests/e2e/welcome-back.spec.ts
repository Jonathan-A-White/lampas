import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Welcome back (src/WelcomeBack.tsx, mw-1vuvq6.6) at 390x844: after a break of a week or more, the strip above the Reader names the solid items most overdue, with two
// 44 px-high buttons, and Refresh opens a Review round of just them. A phone-width layout claim: it runs under --project=shots.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const DAY = 24 * 60 * 60 * 1000;

/** Writes rows into the app's stores through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, rows: Record<string, unknown[]>) {
  await page.evaluate(
    (all) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(Object.keys(all), 'readwrite');
          for (const [store, list] of Object.entries(all)) for (const row of list) tx.objectStore(store).put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

const dayOf = (ms: number) => {
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

async function openAfterABreak(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const now = Date.now();
  const gone = dayOf(now - 9 * DAY);
  const word = (lemma: string) => ({ lemma, lemmas: [], gloss: 'g', lesson: 1, state: 'solid', since: now - 90 * DAY });
  const due = (kind: string, id: string, overdue: number) => ({ kind, id, step: 3, due: now - overdue * DAY, lastWhen: now - (overdue + 14) * DAY, lapses: 0, rights: 0 });
  await keep(page, {
    usage: [{ key: `${gone}|screen:home`, day: gone, name: 'screen:home', count: 2 }],
    words: [word('λόγος'), word('ὁδός')],
    grammarLevels: [{ id: 'case-genitive', level: 'solid', since: now - 90 * DAY, how: 'placement' }],
    reviews: [due('word', 'ὁδός', 20), due('grammar', 'case-genitive', 12), due('word', 'λόγος', 9)],
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

test('the strip names the most overdue, fits a phone and has big buttons', async ({ page }) => {
  await openAfterABreak(page);
  const strip = page.getByRole('region', { name: 'Welcome back' });
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('It has been 9 days');
  await expect(strip.locator('li')).toHaveText(['ὁδός', 'The genitive case', 'λόγος']);
  const box = await strip.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  for (const name of ['Refresh', 'Not now']) {
    const button = await strip.getByRole('button', { name }).boundingBox();
    expect(button?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(scrolls).toBe(true);
  await shot(page, 'welcome-back');
});

test('Refresh opens a round of just those and puts the strip away for the day', async ({ page }) => {
  await openAfterABreak(page);
  await page.getByRole('region', { name: 'Welcome back' }).getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
  await expect(page.getByText('1 of 3')).toBeVisible();
  await page.goto('/#/?b=rom&c=8');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Welcome back' })).toHaveCount(0);
});
