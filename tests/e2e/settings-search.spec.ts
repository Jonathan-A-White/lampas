import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// A Pixel-class phone: 412 px wide.
test.use({ viewport: { width: 412, height: 915 } });

test('Settings search at phone width: a 48 px field at the top, "logos" leaves only the Logos settings, clearing brings every setting back', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await expect(search).toBeVisible();
  const box = await search.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  expect(await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // a detail is hidden while its setting is off: Bible in Logos is not here until Logos is On
  await expect(page.getByRole('heading', { name: 'Appearance', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bible in Logos', level: 2 })).toHaveCount(0);

  await search.fill('logos');
  await expect(page.getByRole('switch', { name: 'Logos', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Appearance', level: 2 })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Theme' })).toHaveCount(0);
  await shot(page, 'settings-search-logos');

  await search.fill('zzzz');
  await expect(page.getByText('Nothing in Settings matches')).toBeVisible();

  await search.fill('');
  await expect(page.getByRole('heading', { name: 'Appearance', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More', level: 2 })).toBeVisible();
  await shot(page, 'settings-search-cleared');
});

test('a row with help has a More help button that opens its longer help', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.locator('[data-setting="readSpan"]');
  await expect(row).toBeVisible();
  const toggle = row.getByRole('button', { name: 'More help' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(row.getByRole('button', { name: 'Less help' })).toHaveAttribute('aria-expanded', 'true');
  await expect(row.getByText('How far the app reads aloud')).toBeVisible();
  await shot(page, 'settings-help-open');
});
