// tests/e2e/share-old-testament.spec.ts — an Old Testament reference on the Share to Lampas list (mw-s1dc0n.7), at 390x844: a tap on 'Gen. 1:28' opens the
// 'Not in Lampas yet' card the tutor's references open, headed 'Genesis 1:28', not Romans 8 with a notice; Back returns to the list; with Logos on the card
// has Open in Logos (features/share-references.feature).
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const WORDS = 'God said (Gen. 1:28 ESV) be fruitful.';

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
          tx.objectStore('shares').add({ id: 'old', createdAt: Date.now(), text, files: [] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    WORDS,
  );
  await page.goto('/#/share?s=old');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

test('Gen. 1:28 opens the Not in Lampas yet card, not Romans 8, and Back returns to the list', async ({ page }) => {
  await openShare(page);
  const link = page.getByRole('link', { name: 'Gen. 1:28', exact: true });
  const before = new URL(page.url()).hash;
  await link.tap();

  const card = page.getByRole('dialog', { name: 'Genesis 1:28', exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByText('Not in Lampas yet')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toHaveCount(0);
  await expect(page.locator('[data-link-notice]')).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe(before);
  const box = await card.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844).toBe(true);
  await shot(page, 'share-old-testament');

  // Back closes the card and the list is still there.
  await page.goBack();
  await expect(card).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
  await expect(link).toBeVisible();
});

test('with Logos on the card offers Open in Logos', async ({ page }) => {
  await openShare(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['settings'], 'readwrite');
          tx.objectStore('settings').put({ key: 'resource.logos', value: 'on' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await page.getByRole('link', { name: 'Gen. 1:28', exact: true }).tap();
  const card = page.getByRole('dialog', { name: 'Genesis 1:28', exact: true });
  await expect(card.getByRole('link', { name: 'Open in Logos' })).toBeVisible();
});
