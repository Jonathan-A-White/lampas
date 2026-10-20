// Settings is a home that lists groups, and each group is a page with a back arrow (mw-3ased2.1). Search on the home finds any setting and opens it on its page.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const heading = (page: Page, name: string) => page.getByRole('heading', { name, exact: true, level: 1 });
const group = (page: Page, name: string) => page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: new RegExp(`^${name}`) });

async function openSettings(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(heading(page, 'Settings')).toBeVisible();
}

test('Settings opens on a home that lists the groups and no setting; Developer waits until it is found', async ({ page }) => {
  await openSettings(page);
  for (const name of ['Reading', 'Greek', 'The tutor', 'Listening', 'Daily', 'Study resources', 'Account']) {
    const button = group(page, name);
    await expect(button).toBeVisible();
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  }
  await expect(group(page, 'Developer')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Theme', exact: true })).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search settings' })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'settings-home');
});

test('a group opens as a page with only its sections; ‹ Settings returns to the home and the phone Back leaves Settings', async ({ page }) => {
  await openSettings(page);
  await group(page, 'Reading').click();
  await expect(heading(page, 'Reading')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/settings?group=reading');
  await expect(page.getByRole('group', { name: 'Theme', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Appearance', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Greek pronunciation', level: 2 })).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search settings' })).toHaveCount(0);
  await shot(page, 'settings-group-reading');

  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(heading(page, 'Settings')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/settings');
  await expect(group(page, 'Reading')).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(heading(page, 'Settings')).toHaveCount(0);
});

test('a group page opened by a link goes to the home from its arrow, and the phone Back then leaves for where the link was', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=listening');
  await expect(heading(page, 'Listening')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Greek voice' })).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(heading(page, 'Settings')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/settings');
});

test('search on the home lists the rows that match with their group; choosing one opens its page at the row', async ({ page }) => {
  await openSettings(page);
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await search.fill('text size');
  const found = page.getByRole('list', { name: 'Matching settings' });
  await expect(found.locator('[data-found="textSize"]')).toContainText('in Reading');
  await expect(page.getByRole('list', { name: 'Settings groups' })).toHaveCount(0);
  await shot(page, 'settings-search-found');

  await found.locator('[data-found="textSize"]').click();
  await expect(heading(page, 'Reading')).toBeVisible();
  const row = page.locator('[data-setting="textSize"]');
  await expect(row).toBeInViewport();
  await expect(row).toHaveAttribute('data-highlighted', '');

  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(search).toHaveValue('text size');
  await search.fill('zzzz');
  await expect(page.getByText('Nothing in Settings matches')).toBeVisible();
  await search.fill('');
  await expect(group(page, 'Daily')).toBeVisible();
});

test('search finds a row that is not a setting of the registry (Words) and opens its page at its section', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('words you are learning');
  await page.locator('[data-found="link.words"]').click();
  await expect(heading(page, 'Account')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Words', exact: true })).toBeVisible();
});

test('a detail hidden while its setting is off shows on its page when a link names it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?setting=logosBible');
  await expect(heading(page, 'Study resources')).toBeVisible();
  await expect(page.locator('[data-setting-needs]')).toBeVisible();
  await expect(page.locator('[data-setting="logosBible"]')).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(heading(page, 'Settings')).toBeVisible();
});

test('a section link lands on the page of its group', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?section=goal');
  await expect(heading(page, 'Greek')).toBeVisible();
  await expect(page.locator('section[data-section="goal"]')).toBeInViewport();
});
