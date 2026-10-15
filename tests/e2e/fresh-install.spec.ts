import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// A new install starts with none of the Governor's progress (mw-5r3p30.385): a fresh browser context, licensed, welcome done.

async function rowsIn(page: Page, tables: string[]): Promise<Record<string, number>> {
  return page.evaluate(
    (names) =>
      new Promise<Record<string, number>>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const out: Record<string, number> = {};
          const tx = db.transaction(names, 'readonly');
          for (const name of names) {
            const count = tx.objectStore(name).count();
            count.onsuccess = () => {
              out[name] = count.result;
            };
          }
          tx.oncomplete = () => {
            db.close();
            resolve(out);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    tables,
  );
}

test('a fresh install shows nothing of his on Words, Review, the grammar ladder and Settings', async ({ page }) => {
  await openUnlocked(page, { empty: true });
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await expect(page.getByTestId('word-counts')).toHaveText('0 solid, 0 learning');
  const empty = page.getByTestId('words-empty');
  await expect(empty).toContainText('No words yet');
  await expect(empty.getByRole('button', { name: 'Placement' })).toBeVisible();
  await expect(empty.getByRole('button', { name: 'Import' })).toBeVisible();
  await expect(page.locator('[data-lemma]')).toHaveCount(0);
  await shot(page, 'words-empty');

  await page.goto('/#/review');
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
  await expect(page.getByTestId('due-today')).toHaveText('Due today: 0 words');

  // the grammar ladder: no table has a form unlocked
  await page.goto('/#/paradigms');
  await expect(page.getByRole('heading', { name: 'Paradigms', level: 1 })).toBeVisible();
  const bars = page.getByRole('progressbar', { name: 'Available forms' });
  await expect(bars.first()).toBeVisible();
  for (const bar of await bars.all()) await expect(bar).toHaveAttribute('aria-valuenow', '0');

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  // and nothing was written for him behind the screens
  await page.waitForTimeout(500);
  const counts = await rowsIn(page, ['words', 'reviews', 'grammarLevels', 'grammarKnown', 'settings', 'talks', 'results']);
  expect(counts).toEqual({ words: 0, reviews: 0, grammarLevels: 0, grammarKnown: 0, settings: 0, talks: 0, results: 0 });
});

test('a phone that already holds his words keeps them after the app opens', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByTestId('word-counts')).toHaveText('54 solid, 9 learning');
  await page.reload();
  await expect(page.getByTestId('word-counts')).toHaveText('54 solid, 9 learning');
  await expect(page.getByTestId('words-empty')).toHaveCount(0);
});
