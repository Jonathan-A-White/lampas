// tests/e2e/memorize-enter.spec.ts — how a verse enters memorizing (mw-fu7dqf.5) at 390x844: the 'Memorize this list' switch on a verse list memorizes its New Testament references in English and
// names the Old Testament one as skipped, each row reads 'Memorizing · English', and the Verse view opened from a row shows the same.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const REFS = ['Rom.8.28', 'Ps.62.1-2', '2Thess.3.3'];

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

test('turn Memorize this list on, then see the verse as memorized in the Verse view', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seedList(page, 'Refuge', REFS);

  await page.goto('/#/library');
  await page.getByTestId('verse-lists-row').getByRole('button', { name: /Verse lists/ }).click();
  await page.getByRole('button', { name: /^Refuge/ }).click();
  await expect(page.getByRole('heading', { name: 'Refuge', level: 1 })).toBeVisible();

  const toggle = page.getByRole('switch', { name: 'Memorize this list' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('No Old Testament text in Lampas yet: Ps 62:1-2', { exact: true })).toBeVisible();
  const rom = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Romans 8:28' }) });
  await expect(rom.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
  // the Old Testament row has no control
  await expect(page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Psalm 62:1-2' }) }).getByRole('button')).toHaveCount(0);

  await shot(page, 'memorize-list');

  // from the row to the verse: the pop-up's Open goes to the Reader, and the verse number opens the Verse view
  await page.getByRole('link', { name: 'Romans 8:28' }).click();
  await page.getByRole('dialog', { name: 'Romans 8:28' }).getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Verse 28' }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
  await shot(page, 'memorize-enter');
});
