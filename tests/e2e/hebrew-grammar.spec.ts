// The Hebrew grammar tiers (mw-gdcyf98.12) at 390x844: with Hebrew chosen the Goal lists the article after the letters, its card opens in Hebrew type with the earth of Genesis 1:1 as the worked word and a table
// drawn right to left in the Hebrew face, and no sideways scroll. The Grammar sheet of a Hebrew term is the word sheet's to open (story j2), so it is proved in features/hebrew-grammar.feature.
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

test('the Goal lists the grammar tiers after the letters, and the article\'s card teaches in Hebrew type', async ({ page }) => {
  await chooseHebrew(page);
  const list = page.getByTestId('hebrew-ideas');
  await expect(list.locator('[data-idea]')).toHaveCount(70);
  const ids = await list.locator('[data-idea]').evaluateAll((els) => els.map((el) => el.getAttribute('data-idea')));
  expect(ids.indexOf('he-article')).toBeGreaterThan(ids.indexOf('he-letter-tav'));
  expect(ids.slice(-2)).toEqual(['he-verbless-clause', 'he-word-order']);
  const card = row(page, 'he-article');
  await card.scrollIntoViewIfNeeded();
  expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await card.click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'The Hebrew article' })).toBeVisible();
  const worked = sheet.getByTestId('worked-word');
  await expect(worked).toHaveText('הָאָרֶץ');
  await expect(worked).toHaveAttribute('lang', 'he');
  await expect(worked).toHaveAttribute('dir', 'rtl');
  await expect(sheet.getByTestId('idea-worked')).toContainText('Genesis 1:1');
  const table = sheet.getByTestId('idea-table');
  await expect(table.locator('[data-cell="the article"] [lang="he"]').first()).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Drill it' })).toHaveCount(0);
  expect(await noSideways(page)).toBe(true);
  await shot(page, 'hebrew-grammar-article');
});

test('a verb card with a long table fits the phone: the stems', async ({ page }) => {
  await chooseHebrew(page);
  const card = row(page, 'he-stems');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'The other stems' })).toBeVisible();
  await expect(sheet.getByTestId('idea-table').locator('tbody tr')).toHaveCount(7);
  expect(await noSideways(page)).toBe(true);
  await shot(page, 'hebrew-grammar-stems');
});
