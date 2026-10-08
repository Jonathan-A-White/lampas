import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 44 px is the floor; a word must clear it by a pixel so one font's metrics can shave a little and it still holds.
const TAP_WITH_MARGIN = 45;

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

async function openReader(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('Romans 8 opens in English at phone width, words with a 44 px tap target', async ({ page }) => {
  await openReader(page);
  await expect(page.locator('[data-verse]')).toHaveCount(39);

  const word = page.locator('[data-verse="1"] [data-chunk="0"]');
  const box = await word.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(TAP_WITH_MARGIN);
  const number = await page.getByRole('button', { name: 'Verse 1', exact: true }).boundingBox();
  expect(number?.height).toBeGreaterThanOrEqual(43.5);
  expect(number?.width).toBeGreaterThanOrEqual(43.5);
  const switchBox = await page.getByRole('button', { name: 'Greek', exact: true }).boundingBox();
  expect(switchBox?.height).toBeGreaterThanOrEqual(43.5);

  await expect(page.getByTestId('build-version')).toHaveText(/^v\d+\.\d+\.\d+ · \d{4}-\d{2}-\d{2} \d{2}:\d{2}Z · [0-9a-f]{7,}$/);
  await expectFitsPhone(page);
  await shot(page, 'reader-english');
});

test('the Greek view sets verse 1 in Gentium Plus with polytonic accents', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await expect(page.locator('[data-verse="1"] [data-text]')).toContainText('Οὐδὲν ἄρα νῦν κατάκριμα');

  const fontLoaded = await page.evaluate(async () => {
    await document.fonts.load('28px "Gentium Plus"', 'ἄρα Οὐδὲν');
    return document.fonts.check('28px "Gentium Plus"', 'ἄρα Οὐδὲν');
  });
  expect(fontLoaded).toBe(true);
  const family = await page.locator('[data-verse="1"]').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain('Gentium Plus');
  const size = await page.locator('[data-verse="1"]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(26);

  const word = await page.locator('[data-verse="1"] [data-word="1"]').boundingBox();
  expect(word?.height).toBeGreaterThanOrEqual(TAP_WITH_MARGIN);

  await expectFitsPhone(page);
  await shot(page, 'reader-greek');
});

test('a tap opens the word sheet at the bottom, inside the phone, and a tap outside closes it', async ({ page }) => {
  await openReader(page);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Therefore', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('sheet-word')).toHaveText('ἄρα');
  await expect(dialog.getByTestId('sheet-strongs')).toHaveText('G686');
  const box = await dialog.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  expect(box && box.y).toBeGreaterThan(844 * 0.3);
  const done = await dialog.getByRole('button', { name: 'Done' }).boundingBox();
  expect(done?.height).toBeGreaterThanOrEqual(43.5);
  await expectFitsPhone(page);
  await shot(page, 'word-sheet');

  await page.getByTestId('sheet-backdrop').click({ position: { x: 195, y: 100 } });
  await expect(dialog).toBeHidden();
});

test('the word sheet says how to pronounce the word, in capitals for the stress, and shows no beta-code', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'χριστῷ', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('sheet-word')).toHaveText('χριστῷ');
  await expect(dialog.getByTestId('sheet-respelling')).toHaveText('hree-STO');
  await expect(dialog).not.toContainText('cristw');
  await expect(page.locator('body')).not.toContainText('cristw');
  await expectFitsPhone(page);
  await shot(page, 'word-sheet-respelling');
});
