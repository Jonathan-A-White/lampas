import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test('About credits the data at phone width, reached from Home', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const about = page.getByRole('button', { name: 'About', exact: true });
  await about.scrollIntoViewIfNeeded();
  const tap = await about.boundingBox();
  expect(tap?.height).toBeGreaterThanOrEqual(43.5);
  await about.click();

  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
  const licence = page.getByRole('link', { name: 'https://creativecommons.org/licenses/by/4.0/' });
  await expect(licence).toBeVisible();
  await expect(page.getByText('Tyndale House').first()).toBeVisible();

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);

  await shot(page, 'about');
});
