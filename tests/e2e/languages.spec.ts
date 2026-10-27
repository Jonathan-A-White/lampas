// Which languages? and a dial for each (mw-gdcyf98.2) at 390x844: the first row of the Settings home, four choices, a dial under each language chosen with five steps (Just English
// is the row's English only, never a button), and nothing Greek or Hebrew while English only is chosen. A new phone starts at English only (an empty storage state).
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

const languages = (page: Page) => page.getByRole('group', { name: 'Which languages?', exact: true });
const choose = (page: Page, name: string) => languages(page).getByRole('button', { name, exact: true });
const greek = (page: Page) => page.getByRole('group', { name: 'How much Greek?', exact: true });
const hebrew = (page: Page) => page.getByRole('group', { name: 'How much Hebrew?', exact: true });

test.beforeEach(async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
});

test('a new phone is English only: the four choices on top and no dial', async ({ page }) => {
  await expect(languages(page)).toBeVisible();
  const search = await page.getByRole('searchbox', { name: 'Search settings' }).boundingBox();
  const box = await languages(page).boundingBox();
  expect(box!.y).toBeGreaterThan(search!.y);
  await expect(languages(page).getByRole('button')).toHaveText(['English only', 'Greek', 'Hebrew', 'Greek and Hebrew']);
  await expect(choose(page, 'English only')).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['English only', 'Greek', 'Hebrew', 'Greek and Hebrew']) expect((await choose(page, name).boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await expect(greek(page)).toHaveCount(0);
  await expect(hebrew(page)).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ })).toHaveCount(0);
  await shot(page, 'languages-english-only');
});

test('each language chosen draws its dial at Curious, five steps, each a thumb', async ({ page }) => {
  await choose(page, 'Greek').click();
  await expect(choose(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
  await expect(greek(page).locator('[data-step]')).toHaveCount(5);
  await expect(greek(page).getByRole('button', { name: 'Curious', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(hebrew(page)).toHaveCount(0);

  await choose(page, 'Hebrew').click();
  await expect(hebrew(page).locator('[data-step]')).toHaveCount(5);
  await expect(hebrew(page).getByRole('button', { name: 'Curious', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(hebrew(page).getByRole('button', { name: 'Reading in Hebrew', exact: true })).toBeVisible();
  await expect(greek(page)).toHaveCount(0);
  await expect(page.getByTestId('hebrew-line')).toContainText('Hebrew');
  // Hebrew in the tutor is the Hebrew dial's: on the Learning page from Curious up
  await page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ }).click();
  await expect(page.getByRole('group', { name: 'Hebrew in the tutor', exact: true })).toBeVisible();
});

test('both languages draw both dials, and English only keeps their levels for the way back', async ({ page }) => {
  await choose(page, 'Greek and Hebrew').click();
  await expect(greek(page)).toBeVisible();
  await expect(hebrew(page)).toBeVisible();
  for (const dial of [greek(page), hebrew(page)]) {
    for (const button of await dial.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  }
  await greek(page).getByRole('button', { name: 'Learning', exact: true }).click();
  await hebrew(page).getByRole('button', { name: 'Reading in Hebrew', exact: true }).click();
  await expect(hebrew(page).getByRole('button', { name: 'Reading in Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(greek(page).getByRole('button', { name: 'Learning', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('main.screen').evaluate((el) => {
    el.scrollTop = 0;
  });
  await shot(page, 'languages-both');

  await choose(page, 'English only').click();
  await expect(greek(page)).toHaveCount(0);
  await expect(hebrew(page)).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ })).toHaveCount(0);
  await choose(page, 'Greek and Hebrew').click();
  await expect(greek(page).getByRole('button', { name: 'Learning', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(hebrew(page).getByRole('button', { name: 'Reading in Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openGroup(page, 'Learning');
});
