// tests/e2e/settings-home-place.spec.ts — the Settings home is where he left it after a trip to Sermon sources (mw-6ww.175.102). His report, at 390x844: Menu > Settings, scroll the home a
// little, tap Study resources, tap Sermon sources, then Back twice: the home had jumped to the bottom. Sermon sources ('#/settings?sources=sermons') had no scroll place of its own
// (src/nav/scrollMemory.ts scrollAddress), so opening it "at the top" (src/settings/link.ts openSermonSources) forgot the home's place instead of its own.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSettings, settingsHeading } from './openSettings';
import { openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const GROUP = 'Study resources';
const SOURCES = 'Sermon sources';
/** The screen's scrolling box. */
const box = (page: Page): Locator => page.locator('main.screen');
const scrollTop = (page: Page): Promise<number> => box(page).evaluate((el) => el.scrollTop);
/** The home's place as the app has written it to the phone (localStorage 'lampas.scrolls', 250 ms after the last scroll: src/nav/lastRoute.ts), or null when it holds none. */
const keptHome = (page: Page): Promise<number | null> =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('lampas.scrolls') ?? '{}') as Record<string, Record<string, number>>)['#/settings']?.['#/settings#settings'] ?? null);

/** The row of the home he taps. */
const groupRow = (page: Page): Locator => page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: new RegExp(`^${GROUP}`) });

/** Menu > Settings, the home scrolled by his hand until the row Study resources is well on screen (on this phone the three dials above the groups put it below the fold), short of the
 *  bottom; gives the scrollTop he left it at, once the app has kept it. */
async function leaveTheHomeScrolled(page: Page): Promise<number> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await openSettings(page);
  await expect(settingsHeading(page)).toBeVisible();
  await expect(groupRow(page)).toBeVisible();
  // the dials above the groups draw one by one: the list has stopped growing when the last row of the home is drawn
  await expect(page.getByRole('list', { name: 'Settings groups' }).locator('[data-door="counted"]')).toBeVisible();

  // the wheel, as his finger: far enough that the row's foot is 60 px clear of the foot of the screen
  const [screen, row] = [await box(page).boundingBox(), await groupRow(page).boundingBox()];
  if (!screen || !row) throw new Error('the home is not drawn');
  const far = Math.round(row.y + row.height - (screen.y + screen.height) + 60);
  expect(far, 'the row starts below the fold, so there is a place to lose').toBeGreaterThan(0);
  await page.mouse.move(195, 500);
  await page.mouse.wheel(0, far);
  await expect.poll(() => scrollTop(page)).toBe(far);
  await expect.poll(() => keptHome(page)).toBe(far);
  // neither the top nor the bottom of the list: a home that jumped to either end is not where he left it
  expect(far).toBeLessThan(await box(page).evaluate((el) => el.scrollHeight - el.clientHeight));
  // the row he taps next is wholly on screen, so the tap itself does not move the list
  await expect(groupRow(page)).toBeInViewport({ ratio: 1 });
  expect(await scrollTop(page)).toBe(far);
  return far;
}

/** Study resources > Sermon sources, from the home. */
async function openSermonSources(page: Page): Promise<void> {
  await openGroup(page, GROUP);
  await page.getByRole('button', { name: new RegExp(`^${SOURCES}`) }).click();
  await expect(page.getByRole('heading', { name: SOURCES, exact: true, level: 1 })).toBeVisible();
  expect(page.url()).toContain('#/settings?sources=sermons');
}

/** The home is drawn again and is where he left it, on the screen and in what the phone keeps. */
async function expectHomeAt(page: Page, left: number): Promise<void> {
  await expect(settingsHeading(page)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Settings groups' })).toBeVisible();
  await expect.poll(() => scrollTop(page)).toBe(left);
  expect(await keptHome(page)).toBe(left);
}

test("after Sermon sources, the phone's Back twice shows the Settings home where he left it", async ({ page }) => {
  const left = await leaveTheHomeScrolled(page);
  await openSermonSources(page);

  await page.goBack();
  await expect(page.getByRole('heading', { name: GROUP, exact: true, level: 1 })).toBeVisible();
  await page.goBack();
  await expectHomeAt(page, left);
  await shot(page, 'settings-home-place');
  // and it stays there once the place is put back
  expect(await scrollTop(page)).toBe(left);
});

test('after Sermon sources, the two back arrows show the Settings home where he left it', async ({ page }) => {
  const left = await leaveTheHomeScrolled(page);
  await openSermonSources(page);

  await page.getByRole('button', { name: '‹ Study resources', exact: true }).click();
  await expect(page.getByRole('heading', { name: GROUP, exact: true, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expectHomeAt(page, left);
  await shot(page, 'settings-home-place-arrows');
  // and it stays there once the place is put back
  expect(await scrollTop(page)).toBe(left);
});
