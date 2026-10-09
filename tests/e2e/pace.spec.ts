import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Makes the first `n` listed words due, through raw IndexedDB, as the app wrote its reviews.
async function makeDue(page: Page, n: number) {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const read = idb.transaction('words').objectStore('words').getAllKeys();
          read.onsuccess = () => {
            const tx = idb.transaction('reviews', 'readwrite');
            const day = 24 * 60 * 60 * 1000;
            for (const id of (read.result as string[]).slice(0, count)) {
              tx.objectStore('reviews').put({ kind: 'word', id, step: 3, due: Date.now() - day, lastWhen: Date.now() - 10 * day, lapses: 0, rights: 0 });
            }
            tx.oncomplete = () => {
              idb.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        };
      }),
    n,
  );
}

test('Settings > New words: New words a day is one line of 48 px chips, and says Dialled back with 25 words due', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByTestId('new-words')).toBeVisible();
  // raw IndexedDB writes tell no live query: reopen the Reader on them
  await makeDue(page, 25);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByTestId('new-words')).toHaveCount(0);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const group = page.getByRole('group', { name: 'New words a day', exact: true });
  await group.scrollIntoViewIfNeeded();
  const tops: number[] = [];
  for (const chip of ['Off', '3', '5', '10']) {
    const b = await group.getByRole('button', { name: chip, exact: true }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    expect(b?.width).toBeGreaterThanOrEqual(47.5);
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(390);
    tops.push(Math.round(b?.y ?? 0));
  }
  expect(new Set(tops).size).toBe(1);
  await expect(group.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('pace-note')).toHaveText('Dialled back: clear your reviews first');
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'pace-dialled-back');
});
