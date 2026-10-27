// The Hebrew ladder on the Goal screen (mw-gdcyf98.10) at 390x844: with Hebrew chosen the Goal shows The Hebrew alphabet as a card that opens its sheet in Hebrew type and can be marked
// known; with both chosen the Greek | Hebrew segment sits at the top, a thumb-sized pair, and switches the ladders; with Greek only no segment and no Hebrew idea.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

const chooseLanguages = async (page: Page, name: 'Greek' | 'Hebrew' | 'Greek and Hebrew'): Promise<void> => {
  await page.goto('/#/settings');
  const languages = page.getByRole('group', { name: 'Which languages?', exact: true });
  await languages.getByRole('button', { name, exact: true }).click();
  await expect(languages.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
};

const openGoal = async (page: Page): Promise<void> => {
  await page.goto('/#/goal');
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
};

const segment = (page: Page) => page.getByTestId('source-segment');
const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.beforeEach(async ({ page }) => {
  await openUnlocked(page);
});

test('with Hebrew chosen the Goal shows The Hebrew alphabet, which opens in Hebrew type and is marked known', async ({ page }) => {
  await chooseLanguages(page, 'Hebrew');
  await openGoal(page);
  await expect(segment(page)).toHaveCount(0);
  const card = page.getByTestId('hebrew-ideas').getByRole('button', { name: /The Hebrew alphabet/ });
  await expect(card).toBeVisible();
  expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await expect(page.getByText('The Greek alphabet')).toHaveCount(0);
  expect(await noSideways(page)).toBe(true);
  await card.click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'The Hebrew alphabet' })).toBeVisible();
  const worked = sheet.getByTestId('worked-word');
  await expect(worked).toHaveAttribute('lang', 'he');
  await expect(worked).toHaveAttribute('dir', 'rtl');
  await expect(sheet.getByRole('button', { name: 'Drill it' })).toHaveCount(0);
  await shot(page, 'hebrew-ladder-idea');
  await sheet.getByRole('button', { name: 'Mark known without a drill' }).click();
  await expect(sheet.getByTestId('idea-level')).toContainText('Solid');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(card).toContainText('Solid');
});

test('with both chosen the segment tops the Goal and switches the ladders', async ({ page }) => {
  await chooseLanguages(page, 'Greek and Hebrew');
  await openGoal(page);
  await expect(segment(page)).toBeVisible();
  const greek = segment(page).getByRole('button', { name: 'Greek', exact: true });
  const hebrew = segment(page).getByRole('button', { name: 'Hebrew', exact: true });
  await expect(greek).toHaveAttribute('aria-pressed', 'true');
  for (const step of [greek, hebrew]) expect((await step.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  const header = await page.getByRole('heading', { name: 'Goal', exact: true, level: 1 }).boundingBox();
  expect((await segment(page).boundingBox())!.y).toBeGreaterThan(header!.y);
  await expect(page.getByText('The Hebrew alphabet')).toHaveCount(0);
  await expect(page.getByText('No goal yet')).toBeVisible();
  await hebrew.click();
  await expect(hebrew).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('hebrew-ideas').getByRole('button', { name: /The Hebrew alphabet/ })).toBeVisible();
  await expect(page.getByText('No goal yet')).toHaveCount(0);
  expect(await noSideways(page)).toBe(true);
  await shot(page, 'hebrew-ladder-goal-segment');
  // the segment is kept: the Goal opens on Hebrew again
  await page.reload();
  await expect(segment(page).getByRole('button', { name: 'Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await greek.click();
  await expect(page.getByText('No goal yet')).toBeVisible();
  await expect(page.getByText('The Hebrew alphabet')).toHaveCount(0);
});

test('with Greek only there is no segment and no Hebrew idea', async ({ page }) => {
  await chooseLanguages(page, 'Greek');
  await openGoal(page);
  await expect(page.getByText('No goal yet')).toBeVisible();
  await expect(segment(page)).toHaveCount(0);
  await expect(page.getByText('The Hebrew alphabet')).toHaveCount(0);
});
