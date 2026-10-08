import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: import('@playwright/test').Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('the Words screen lists the seeded words by lesson at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await expect(page.getByTestId('word-counts')).toHaveText('54 solid, 9 learning');
  await expect(page.getByRole('heading', { name: 'Lesson 1', level: 2, exact: true })).toBeVisible();

  const row = page.locator('[data-lemma]').first();
  const box = await row.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await shot(page, 'words');
});

test('the Import screen previews a pasted list and keeps Add in reach at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/import');
  await expect(page.getByRole('heading', { name: 'Import', level: 1 })).toBeVisible();
  await page.getByRole('textbox').fill('ἀνάστασις — resurrection\nπνεῦμα, spirit\nspirit');
  await expect(page.getByTestId('import-summary')).toHaveText('2 words to add');

  const add = page.getByRole('button', { name: 'Add 2 words' });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await shot(page, 'import');
});
