// The Hebrew letters (mw-gdcyf98.11) at 390x844: with Hebrew chosen the Goal lists the letters, Alef's sheet shows the letter in Hebrew type with Hear it, and Got it on The Hebrew alphabet starts the
// letter drill, whose glyphs are drawn right to left in the Hebrew face at the drill's size, a thumb tall.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

const chooseHebrew = async (page: Page): Promise<void> => {
  await page.goto('/#/settings');
  const languages = page.getByRole('group', { name: 'Which languages?', exact: true });
  await languages.getByRole('button', { name: 'Hebrew', exact: true }).click();
  await expect(languages.getByRole('button', { name: 'Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/goal');
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
};

const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const row = (page: Page, id: string) => page.getByTestId('hebrew-ideas').locator(`[data-idea="${id}"] button`);

test.beforeEach(async ({ page }) => {
  await openUnlocked(page);
});

test('Alef\'s sheet shows the letter in Hebrew type, with Hear it a thumb tall', async ({ page }) => {
  await chooseHebrew(page);
  await expect(page.getByTestId('hebrew-ideas').locator('[data-idea]')).toHaveCount(70);
  await row(page, 'he-letter-alef').click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'Alef' })).toBeVisible();
  const worked = sheet.getByTestId('worked-word');
  await expect(worked).toHaveAttribute('lang', 'he');
  await expect(worked).toHaveAttribute('dir', 'rtl');
  await expect(sheet.getByTestId('idea-sounds')).toContainText('nothing');
  const hear = sheet.getByRole('button', { name: 'Hear it', exact: true });
  await expect(hear).toBeVisible();
  const box = (await hear.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(43.5);
  expect(box.width).toBeGreaterThanOrEqual(43.5);
  expect(await noSideways(page)).toBe(true);
  await shot(page, 'hebrew-letters-alef');
});

test('Got it on The Hebrew alphabet starts the letter drill, its glyphs drawn right to left', async ({ page }) => {
  await chooseHebrew(page);
  await row(page, 'he-alphabet').click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await sheet.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');
  const drill = page.getByRole('dialog', { name: 'Letter drill' });
  await expect(drill).toBeVisible();
  await expect(drill.getByTestId('letter-drill-step')).toContainText('Round 1 · Question 1 of 8');
  const options = drill.locator('[data-option]');
  await expect(options).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    const option = options.nth(i);
    await expect(option).toHaveAttribute('lang', 'he');
    await expect(option).toHaveAttribute('dir', 'rtl');
    expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  }
  expect(await noSideways(page)).toBe(true);
  await shot(page, 'hebrew-letters-drill');
});
