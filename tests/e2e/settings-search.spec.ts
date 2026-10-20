import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// A Pixel-class phone: 412 px wide.
test.use({ viewport: { width: 412, height: 915 } });

test('Settings search at phone width: a 48 px field at the top, "logos" lists the Logos settings with their group, clearing brings the groups back', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await expect(search).toBeVisible();
  const box = await search.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  expect(await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  const groups = page.getByRole('list', { name: 'Settings groups' });
  await expect(groups.getByRole('button', { name: /^Reading/ })).toBeVisible();
  await expect(groups.getByRole('button', { name: /^Account/ })).toBeVisible();

  // a detail is hidden while its setting is off: Bible in Logos is found through the Logos switch
  await search.fill('logos');
  const found = page.getByRole('list', { name: 'Matching settings' });
  await expect(found.locator('[data-found="resource.logos"]')).toContainText('in Study resources');
  await expect(found.locator('[data-found="logosBible"]')).toHaveCount(0);
  await expect(found.locator('[data-found="theme"]')).toHaveCount(0);
  await expect(groups).toHaveCount(0);
  for (const button of await found.getByRole('button').all()) expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'settings-search-logos');

  await search.fill('zzzz');
  await expect(page.getByText('Nothing in Settings matches')).toBeVisible();

  await search.fill('');
  await expect(groups.getByRole('button', { name: /^Reading/ })).toBeVisible();
  await expect(groups.getByRole('button', { name: /^Account/ })).toBeVisible();
  await shot(page, 'settings-search-cleared');
});

test('choosing a found setting opens its group page with the row in view; ‹ Settings returns to the search', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await search.fill('greek speed');
  await page.locator('[data-found="greekRate"]').click();
  await expect(page.getByRole('heading', { name: 'Listening', exact: true, level: 1 })).toBeVisible();
  const row = page.locator('[data-setting="greekRate"]');
  await expect(row).toBeInViewport();
  await expect(row).toHaveAttribute('data-highlighted', '');
  await shot(page, 'settings-search-opened-row');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(search).toHaveValue('greek speed');
  await expect(page.locator('[data-found="greekRate"]')).toBeVisible();
});

test('a row with help has a More help button that opens its longer help', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=listening');
  const row = page.locator('[data-setting="readSpan"]');
  await expect(row).toBeVisible();
  const toggle = row.getByRole('button', { name: 'More help' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(row.getByRole('button', { name: 'Less help' })).toHaveAttribute('aria-expanded', 'true');
  await expect(row.getByText('How far the app reads aloud')).toBeVisible();
  await shot(page, 'settings-help-open');
});
