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

test('a search for "library" finds Your Logos library in Tools, and opens the Library (mw-5r3p30.754)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await page.goto('/#/settings');
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('library');
  const answer = page.getByRole('list', { name: 'Matching tools' }).getByRole('button', { name: /^Your Logos library/ });
  await expect(answer).toBeVisible();
  await expect(answer).toContainText('in Tools');
  await answer.click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', exact: true, level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/library');
});

test('a book\'s title answers one row "Books of your library · 1 match" that opens the Library filtered to it (mw-qtu3zvz.281)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await search.fill('bdag');
  const answer = page.getByRole('list', { name: 'Matching lists' }).getByRole('button', { name: 'Books of your library · 1 match' });
  await expect(answer).toBeVisible();
  // no book is listed one by one
  await expect(page.locator('[data-found-book]')).toHaveCount(0);
  expect((await answer.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'settings-search-book');
  await answer.click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/library?q=bdag');
  await expect(page.getByRole('searchbox', { name: 'Search your books' })).toHaveValue('bdag');
  await expect(page.getByTestId('library-results').getByRole('button', { name: /^BDAG/ })).toBeVisible();
  // Back is the search as he left it
  await page.getByRole('button', { name: '‹ Settings' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search settings' })).toHaveValue('bdag');
  // a word that is no book and no setting still says so
  await page.goto('/#/settings');
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('zzzz');
  await expect(page.getByText('Nothing in Settings matches')).toBeVisible();
});

// his picture of 2026-11-23: Settings searched for "sermons" was one long list, the two real settings lost among the sources (mw-qtu3zvz.281)
test('a search for "sermons" lists the settings first and the sermon sources as ONE row with their count, which opens the list filtered; Back returns to the search', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await search.fill('sermons');
  const found = page.getByRole('list', { name: 'Matching settings' });
  await expect(found.locator('[data-found="sermonsOpenWeb"]')).toContainText('in Study resources');
  const row = page.locator('[data-found-list="sermons"]');
  await expect(row).toContainText(/^Sermon sources · \d+ match/);
  const said = Number(/· (\d+) match/.exec((await row.textContent()) ?? '')?.[1]);
  expect(said).toBeGreaterThan(1);
  await expect(page.locator('[data-found^="sermons."]')).toHaveCount(0);
  // the settings are above the row, and the row is one tap high
  const [settingsBox, rowBox] = await Promise.all([found.boundingBox(), row.boundingBox()]);
  expect(settingsBox!.y).toBeLessThan(rowBox!.y);
  expect(rowBox!.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'settings-search-sermons');
  await row.click();
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search sermon sources' })).toHaveValue('sermons');
  await expect(page.locator('[data-source]')).toHaveCount(said);
  await shot(page, 'settings-search-sermons-list');
  await page.getByRole('button', { name: '‹ Settings' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search settings' })).toHaveValue('sermons');
  await expect(page.locator('[data-found-list="sermons"]')).toContainText(`Sermon sources · ${said} match`);
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
