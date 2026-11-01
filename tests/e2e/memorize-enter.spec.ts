// tests/e2e/memorize-enter.spec.ts — how a verse enters memorizing (mw-fu7dqf.5) at 390x844: the 'Memorize this list' switch on a verse list memorizes its references, of either testament, in English
// (the Old Testament is carried, mw-uqlxea), each row reads 'Memorizing · English', and the Verse view opened from a row shows the same.
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
  // nothing is skipped: every row, the Old Testament's too, is memorized in English
  await expect(page.getByText(/No Old Testament text/)).toHaveCount(0);
  for (const name of ['Romans 8:28', 'Psalm 62:1-2', '2 Thessalonians 3:3']) {
    const row = page.getByRole('listitem').filter({ has: page.getByRole('link', { name }) });
    await expect(row.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
  }

  await shot(page, 'memorize-list');

  // from the row to the verse: the pop-up's Open goes to the Reader, and the verse number opens the Verse view
  await page.getByRole('link', { name: 'Romans 8:28' }).click();
  await page.getByRole('dialog', { name: 'Romans 8:28' }).getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Verse 28' }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
  await shot(page, 'memorize-enter');
});

test('in the Verse view Memorize is followed by Rehearse, which opens a session on that reference; Back returns (360x740)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8&view=english&weave=off&p=12');
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('button', { name: 'Memorize', exact: true })).toBeVisible();
  await expect(view.getByRole('button', { name: 'Rehearse' })).toHaveCount(0);
  await shot(page, 'memorize-practise-before');

  await view.getByRole('button', { name: 'Memorize', exact: true }).click();
  const practise = view.getByRole('button', { name: 'Rehearse' });
  await expect(practise).toBeVisible();
  // no label wraps: each tools-line button is one line of text
  for (const name of ['Memorizing · English', 'Rehearse']) {
    const box = await view.getByRole('button', { name }).boundingBox();
    expect(box!.height).toBeLessThan(50);
  }
  await shot(page, 'memorize-practise-after');

  await practise.click();
  await expect(page).toHaveURL(/#\/memorize\/Rom\.8\.12-\d+\/en$/);
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await expect(page).toHaveURL(/p=12/);
});
