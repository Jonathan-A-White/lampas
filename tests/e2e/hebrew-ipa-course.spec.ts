// The optional course 'Learn the IPA sounds' for Hebrew (mw-gdcyf98.24) at 390x844 with a touch screen: with Hebrew chosen the Goal's Optional section has two entries, each a thumb
// tall and above the phone's bar; the Hebrew course's card draws its letters and word right to left in the Hebrew face with Hear it; the setting IPA lesson has its row on
// Settings and, Off, takes the Optional section away.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const chooseHebrew = async (page: Page): Promise<void> => {
  await page.goto('/#/settings');
  const languages = page.getByRole('group', { name: 'Which languages?', exact: true });
  await languages.getByRole('button', { name: 'Greek and Hebrew', exact: true }).tap();
  await expect(languages.getByRole('button', { name: 'Greek and Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/goal');
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
};

/** The page has no sideways scroll and nothing wider than the phone. */
async function fits(page: Page): Promise<void> {
  const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length);
  expect(wide).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await openUnlocked(page);
});

test('the Goal has the Greek and the Hebrew entry under Optional, each reachable and a thumb tall', async ({ page }) => {
  await chooseHebrew(page);
  const greek = page.getByTestId('ipa-entry');
  const hebrew = page.getByTestId('ipa-entry-he');
  await hebrew.scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Optional', exact: true })).toBeVisible();
  await expect(greek).toHaveText('Learn the IPA sounds');
  await expect(hebrew).toHaveText('Learn the IPA sounds of Hebrew');
  for (const entry of [greek, hebrew]) {
    const box = (await entry.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await fits(page);
  await shot(page, 'ipa-he-entry');
});

test('the Hebrew course opens on Why learn it?, and a sound card draws its Hebrew right to left with Hear it', async ({ page }) => {
  await chooseHebrew(page);
  await page.getByTestId('ipa-entry-he').scrollIntoViewIfNeeded();
  await page.getByTestId('ipa-entry-he').tap();
  await expect(page.getByRole('heading', { name: 'Learn the IPA sounds of Hebrew', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why learn it?' })).toBeVisible();
  await expect(page.getByText('You do not need this for Lampas or for reading Hebrew.')).toBeVisible();
  await fits(page);
  await page.getByTestId('ipa-start').tap();
  await expect(page.getByTestId('ipa-home')).toBeVisible();
  await fits(page);
  await page.locator('[data-testid=ipa-home] li[data-sound="/ʃ/"] button').tap();
  await expect(page.getByTestId('ipa-card-symbol')).toHaveText('/ʃ/');
  await expect(page.getByTestId('ipa-card-key')).toHaveText('as in “ship”');
  const hebrew = page.getByTestId('ipa-card-word').locator('.script-he');
  await expect(hebrew).toHaveAttribute('dir', 'rtl');
  await expect(hebrew).toHaveAttribute('lang', 'he');
  const letter = page.getByTestId('ipa-card-letters').locator('.script-he').first();
  await expect(letter).toHaveAttribute('dir', 'rtl');
  expect(await letter.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Hebrew|Frank|Ezra|Noto/i);
  const hear = (await page.getByRole('button', { name: 'Hear it' }).boundingBox())!;
  expect(hear.width).toBeGreaterThanOrEqual(43.5);
  expect(hear.height).toBeGreaterThanOrEqual(43.5);
  await fits(page);
  await shot(page, 'ipa-he-card');
});

test('the setting IPA lesson has a row, and Off takes the Optional section from the Goal', async ({ page }) => {
  await chooseHebrew(page);
  await page.goto('/#/settings?setting=ipaLesson');
  const row = page.locator('[data-setting="ipaLesson"]');
  await expect(row).toBeVisible();
  const group = page.getByRole('group', { name: 'IPA lesson', exact: true });
  await expect(group.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'ipa-lesson-setting');
  await group.getByRole('button', { name: 'Off' }).tap();
  await expect(group.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/goal');
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByTestId('ipa-entry')).toHaveCount(0);
  await expect(page.getByTestId('ipa-entry-he')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Optional', exact: true })).toHaveCount(0);
});
