// tests/e2e/memorize-today.spec.ts — Today's Memorize piece (mw-fu7dqf.10) at 390x844: a memorized verse that is due, the piece 'Memorize: 1 verse due' on Today, and a tap landing on
// that verse's session. The Today chip counts the piece.
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
