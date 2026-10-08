import { expect, test } from '@playwright/test';
import { shot } from './shot';

test('the home screen fits a phone and shows the name and version', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lampas' })).toBeVisible();
  await expect(page.getByTestId('build-version')).toContainText(/^\d+\.\d+\.\d+ · /);

  // The page itself never scrolls and never grows wider than the window.
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);

  await shot(page, 'home');
});
