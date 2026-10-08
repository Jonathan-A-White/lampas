import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('the phone\'s Back on the word sheet closes it and leaves the Reader on Romans 8 where it was; Done leaves no stray entry', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/words');
  await page.goto('/#/');
  const word = page.locator('[data-verse="20"] [data-chunk="2"]').first();
  await word.scrollIntoViewIfNeeded();
  const box = page.locator('main[data-reader]');
  const before = await box.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(0);

  await word.click();
  const sheet = page.getByRole('dialog', { name: 'Word' });
  await expect(sheet).toBeVisible();

  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#\/$|#\/\?/);
  await expect(page.getByRole('heading', { name: 'Romans 8' })).toBeVisible();
  expect(await box.evaluate((el) => el.scrollTop)).toBe(before);
  await shot(page, 'sheet-back');

  // Done takes its own entry off: the next Back goes to the Words screen, not to a sheet that is already shut.
  await word.click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/#\/words$/);
});
