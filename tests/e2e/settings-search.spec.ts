import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { turnLogosOn } from './settings-group';

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

test('a search for "library" finds Your Logos library under Study resources, and opens that page at the row (mw-5r3p30.837)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await page.goto('/#/settings');
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('library');
  const answer = page.getByRole('button', { name: /^Your Logos library/ }).first();
  await expect(answer).toBeVisible();
  await expect(answer).toContainText('Study resources');
  await answer.click();
  await expect(page.getByRole('heading', { name: 'Study resources', level: 1 })).toBeVisible();
  const row = page.getByRole('region', { name: 'Study resources' }).getByRole('button', { name: /^Your Logos library · \d+ books? on$/ });
  await expect(row).toBeInViewport();
  await expect(page.locator('[data-setting="library"]')).toHaveAttribute('data-highlighted', /.*/);
});

test('a book\'s title answers a row "BDAG · Your Logos library" that opens its kind page at the book (mw-rfjjzd.5)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await search.fill('bdag');
  const books = page.getByRole('list', { name: 'Matching books' });
  const answer = books.getByRole('button', { name: /^BDAG · Your Logos library/ });
  await expect(answer).toBeVisible();
  await expect(answer).toContainText('in Lexicons');
  expect((await answer.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'settings-search-book');
  await answer.click();
  await expect(page.getByRole('heading', { name: 'Lexicons', level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/library?kind=lexicon&book=LLS%3A46.30.18');
  await expect(page.getByRole('radiogroup', { name: 'BDAG', exact: true })).toBeInViewport();
  await expect(page.locator('[aria-current="true"]')).toContainText('BDAG');
  // a word that is no book and no setting still says so
  await page.goto('/#/settings');
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('zzzz');
  await expect(page.getByText('Nothing in Settings matches')).toBeVisible();
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
  await expect(row.getByText("Where the header's Play stops")).toBeVisible();
  await shot(page, 'settings-help-open');
});
