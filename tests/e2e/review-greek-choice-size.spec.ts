import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

// The Greek spellings on a multiple-choice grammar card ('Words that sound alike', mw-86e9r1.43) draw in the large Greek type (text-3xl, 30 px),
// since the question is to tell two spellings apart by one letter or breathing.

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings', rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

test('a Greek choice on a Review multiple-choice card draws at 30 px', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'words-sound-alike', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  await expect(page.getByTestId('grammar-prompt')).toHaveAttribute('data-idea', 'words-sound-alike');
  const choices = page.locator('[data-option][lang="el"]');
  expect(await choices.count()).toBeGreaterThan(1);
  for (const choice of await choices.all()) {
    expect(await choice.evaluate((el) => getComputedStyle(el).fontSize)).toBe('30px');
  }
  await shot(page, 'review-greek-choice-size');
});
