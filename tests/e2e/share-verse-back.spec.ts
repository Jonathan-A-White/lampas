// tests/e2e/share-verse-back.spec.ts — Back from a verse opened from a shared reference (mw-s1dc0n.11), at 390x844: a tap on 'Rom. 8:28' on the Share to Lampas list
// opens the Verse view on verse 28, and the phone's Back shows the Reader (Romans 8, the view closed), not the share sheet again.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const WORDS = 'And we know that all things work together for good (Rom. 8:28 ESV).';

/** Puts a share in the phone's database, as the share target leaves it, and opens the sheet on it. */
async function openShare(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    (text) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'back', createdAt: Date.now(), text, files: [] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    WORDS,
  );
  await page.goto('/#/share?s=back');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

test('Back from the verse a shared reference opened shows the Reader, not the share sheet', async ({ page }) => {
  await openShare(page);
  await page.getByRole('link', { name: 'Rom. 8:28', exact: true }).tap();

  const verseView = page.getByRole('region', { name: 'Verse view' });
  await expect(verseView).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toHaveCount(0);

  await page.goBack();
  await expect(verseView).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toHaveCount(0);
  expect(new URL(page.url()).hash).not.toContain('#/share');
  await shot(page, 'share-verse-back');
});
