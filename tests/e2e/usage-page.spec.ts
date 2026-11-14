// Settings shows what Lampas has counted (mw-6ww.175.15): two screens opened, then the page: both are under what he opened and a third is under never opened.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const listed = (page: Page, name: string) => page.getByRole('list', { name, exact: true });

test('Settings lists the screens he opened and the ones he never opened', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeVisible();
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'About', exact: true, level: 1 })).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();

  const opened = listed(page, 'Opened');
  await opened.scrollIntoViewIfNeeded();
  await expect(opened.getByRole('listitem').filter({ hasText: /^Words/ })).toBeVisible();
  await expect(opened.getByRole('listitem').filter({ hasText: /^About/ })).toBeVisible();
  await expect(opened.getByRole('listitem').filter({ hasText: /^Goal/ })).toHaveCount(0);
  const never = listed(page, 'Never opened');
  await expect(never.getByRole('listitem').filter({ hasText: /^Goal$/ })).toBeVisible();
  await expect(never.getByRole('listitem').filter({ hasText: /^Words/ })).toHaveCount(0);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'usage-page');
});
