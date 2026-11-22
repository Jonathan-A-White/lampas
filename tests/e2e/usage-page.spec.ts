// Settings shows what Lampas has counted (mw-6ww.175.15): two screens opened, then the page: both are under what he opened and a third is under never opened.
// The page is behind its own row of the Settings home, last in the list of groups (mw-6ww.175.87): the home draws the row and not the lists.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openSettings, openTool, settingsHeading } from './openSettings';
import { openGroup } from './settings-group';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const listed = (page: Page, name: string) => page.getByRole('list', { name, exact: true });
const TITLE = 'What Lampas has counted';
const door = (page: Page) => page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: new RegExp(`^${TITLE}`) });

/** On the Settings home: the row is there and the lists are not; a tap on it opens the page. */
async function openCounted(page: Page): Promise<void> {
  await door(page).scrollIntoViewIfNeeded();
  await expect(door(page)).toBeVisible();
  await expect(listed(page, 'Opened')).toHaveCount(0);
  await expect(listed(page, 'Never opened')).toHaveCount(0);
  await door(page).click();
  await expect(page.getByRole('heading', { name: TITLE, exact: true, level: 1 })).toBeVisible();
}

test('Settings lists the screens he opened and the ones he never opened', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeVisible();
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'About', exact: true, level: 1 })).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();

  // the row is the last of the home's list (Developer mode is not found on this phone) and is a thumb tall
  await door(page).scrollIntoViewIfNeeded();
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button').last()).toHaveAttribute('data-door', 'counted');
  expect((await door(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
  await shot(page, 'usage-row');
  await openCounted(page);
  expect(page.url()).toContain('#/settings?page=counted');
  // the back arrow and the long title share the header's one row
  const back = page.getByRole('button', { name: '‹ Settings', exact: true });
  const [backBox, titleBox] = [await back.boundingBox(), await page.getByRole('heading', { name: TITLE, exact: true, level: 1 }).boundingBox()];
  expect(backBox && titleBox && titleBox.y < backBox.y + backBox.height && titleBox.y + titleBox.height > backBox.y).toBe(true);

  const opened = listed(page, 'Opened');
  await expect(opened.getByRole('listitem').filter({ hasText: /^Words/ })).toBeVisible();
  await expect(opened.getByRole('listitem').filter({ hasText: /^About/ })).toBeVisible();
  await expect(opened.getByRole('listitem').filter({ hasText: /^Goal/ })).toHaveCount(0);
  const never = listed(page, 'Never opened');
  await expect(never.getByRole('listitem').filter({ hasText: /^Goal$/ })).toBeVisible();
  await expect(never.getByRole('listitem').filter({ hasText: /^Words/ })).toHaveCount(0);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'usage-page');

  // ‹ Settings is the home again, where he left it (the row he tapped is on screen), with the row and without the lists
  await back.click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await expect(door(page)).toBeInViewport({ ratio: 1 });
  await expect(listed(page, 'Opened')).toHaveCount(0);
});

// mw-6ww.175.103: the search is his other way to a setting, and the row is the last of a long home: typing its name lists it, and a tap opens the page.
test('the Settings search finds What Lampas has counted and a tap on it opens the page', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('counted');
  const found = page.locator('[data-found="counted"]');
  await expect(found).toBeVisible();
  await expect(found).toContainText(TITLE);
  await expect(found).toContainText('in Settings');
  await expect(page.getByText('Nothing in Settings matches')).toHaveCount(0);
  expect((await found.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await shot(page, 'usage-found');
  await found.click();
  await expect(page.getByRole('heading', { name: TITLE, exact: true, level: 1 })).toBeVisible();
  expect(page.url()).toContain('#/settings?page=counted');
  await expect(listed(page, 'Never opened')).toBeVisible();
});

// mw-6ww.175.79: the screens above were reached by an address typed in; he reaches them by tapping, which pushes the address without a hashchange.
test('Settings counts the screens he opened by tapping, as he opens them', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await openTool(page, 'Words');
  await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeVisible();
  await page.goBack();
  await page.goBack();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openSettings(page);
  await openGroup(page, 'Account');
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About', exact: true, level: 1 })).toBeVisible();
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openSettings(page);
  await expect(settingsHeading(page)).toBeVisible();
  await openCounted(page);
  const opened = listed(page, 'Opened');
  await expect(opened.getByRole('listitem').filter({ hasText: /^Words/ })).toBeVisible();
  await expect(opened.getByRole('listitem').filter({ hasText: /^About/ })).toBeVisible();
  await expect(opened.getByRole('listitem').filter({ hasText: /^Goal/ })).toHaveCount(0);
  await expect(listed(page, 'Never opened').getByRole('listitem').filter({ hasText: /^Goal$/ })).toBeVisible();
});
