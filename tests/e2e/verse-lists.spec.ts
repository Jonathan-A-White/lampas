// tests/e2e/verse-lists.spec.ts — the Verse lists screen (#/lists, mw-9q8wp1.1) at 390x844: from the Library a Verse lists row with the count opens the lists, a list opens to its
// references in the order saved (a tap opens the pop-up, Old Testament or New), Rename keeps the new name, Delete goes back to the lists and Undo brings the list back.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const REFS = ['2Sam.22.3-4', 'Ps.62.1-2', '2Thess.3.3', 'Heb.7.24-25', 'Isa.30.21'];

/** Puts a list in the phone's database, as the Share sheet will leave it. */
async function seedList(page: Page, name: string, refs: string[]): Promise<void> {
  await page.evaluate(
    ({ name, refs }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['verseLists'], 'readwrite');
          tx.objectStore('verseLists').add({ name, refs, created: 1000, updated: 1000 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { name, refs },
  );
}

test('open a list from the Library, rename it, delete it and bring it back with Undo', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seedList(page, 'Refuge', REFS);

  // the Library's row says how many lists, and opens them
  await page.goto('/#/library');
  const row = page.getByTestId('verse-lists-row').getByRole('button', { name: /Verse lists/ });
  await expect(row).toContainText('1 list');
  await row.click();
  await expect(page.getByRole('heading', { name: 'Verse lists', level: 1 })).toBeVisible();
  const open = page.getByRole('button', { name: /^Refuge/ });
  await expect(open).toContainText('5 references');
  await shot(page, 'verse-lists');

  // one list: the references in the order saved
  await open.click();
  await expect(page.getByRole('heading', { name: 'Refuge', level: 1 })).toBeVisible();
  const links = page.getByRole('link');
  await expect(links).toHaveText(['2 Samuel 22:3-4', 'Psalm 62:1-2', '2 Thessalonians 3:3', 'Hebrews 7:24-25', 'Isaiah 30:21']);

  // a tap opens the pop-up: the verse for the New Testament, 'Not in Lampas yet' for the Old
  await page.getByRole('link', { name: 'Hebrews 7:24-25' }).click();
  const card = page.getByRole('dialog', { name: 'Hebrews 7:24-25' });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-reference-text]')).toBeVisible();
  await shot(page, 'verse-list-card');
  await card.getByRole('button', { name: 'Close' }).click();
  await expect(card).toBeHidden();
  await page.getByRole('link', { name: 'Isaiah 30:21' }).click();
  await expect(page.getByRole('dialog', { name: 'Isaiah 30:21' })).toContainText('Not in Lampas yet');
  await page.getByRole('dialog', { name: 'Isaiah 30:21' }).getByRole('button', { name: 'Close' }).click();

  // rename
  await page.getByRole('button', { name: 'Rename' }).click();
  const field = page.getByRole('textbox', { name: 'List name' });
  await field.fill('Safe places');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Safe places', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Safe places', level: 1 })).toBeVisible();

  // delete, then Undo
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Verse lists', level: 1 })).toBeVisible();
  const status = page.getByRole('status').filter({ hasText: 'Safe places deleted' });
  await expect(status).toBeVisible();
  await expect(page.getByRole('button', { name: /^Safe places/ })).toHaveCount(0);
  await shot(page, 'verse-list-deleted');
  await status.getByRole('button', { name: 'Undo' }).click();
  const back = page.getByRole('button', { name: /^Safe places/ });
  await expect(back).toContainText('5 references');
  await expect(status).toBeHidden();
  await shot(page, 'verse-list-undone');

  // thumb-sized, and nothing runs off the side
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(wide).toBeLessThanOrEqual(390);
});
