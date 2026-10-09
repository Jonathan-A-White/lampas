import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

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

test('a due grammar idea is asked first, as tap the form: the verse words are buttons of 48 px or more', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Due: \d+$/ })).toBeVisible();
  // the goal is 1 John 1; the preposition can only be asked as a form to tap
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'preposition', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);

  await page.goto('/#/review');
  await expect(page.getByTestId('due-today')).toHaveText(/^Due today: 1 idea, \d+ words?$/);
  await page.getByRole('button', { name: 'Start' }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveAttribute('data-kind', 'tap-form');
  await expect(prompt).toHaveAttribute('data-idea', 'preposition');
  await expect(prompt).toHaveText(/^Tap the preposition$/);
  await expect(page.getByTestId('grammar-ref')).toHaveText(/^1 John 1:\d+$/);

  const words = page.getByTestId('verse-words').getByRole('button');
  const count = await words.count();
  expect(count).toBeGreaterThan(3);
  for (let i = 0; i < count; i += 1) {
    const box = await words.nth(i).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect(box?.width).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  // the words wrap: more than one row
  const tops = new Set(await Promise.all(Array.from({ length: count }, async (_, i) => Math.round((await words.nth(i).boundingBox())?.y ?? 0))));
  expect(tops.size).toBeGreaterThan(1);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.documentElement.scrollTop === 0);
  expect(fits).toBe(true);

  await words.first().click();
  await expect(page.getByTestId('feedback')).toHaveText(/^(Right\.|Not quite\. The word is .+\.)$/);
  await expect(page.locator('[data-option][data-result="right"]')).toHaveCount(1);
  await expect(page.getByTestId('next')).toBeVisible();
  await shot(page, 'grammar-drill');
});
