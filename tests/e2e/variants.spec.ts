// The Reader's variants (mw-9ji6ek0.5) at 390x844: Revelation 3:1-3 in English, Weave and Greek with Variants Off (as the text was) and On (the unit's words marked,
// a brace after them with the other reading and its witness chip), and the variants chip Off and On in the chips row under English | Weave | Greek (the header's own
// line is full at 390 px). A tap on the chip turns Variants on; a long press opens the filter sheet. Shots: shots/variants-<view>-<off|on>.png (verses 1 to 3, in a
// window made tall enough to hold them), variants-header-<off|on>.png (the header and the chips row), variants-sheet.png, variants-on-dark.png, and the whole page last.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const VIEWS = ['English', 'Weave', 'Greek'] as const;
const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });
const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });

/** The header and the chips row under it, as one picture. */
async function shootTop(page: Page, name: string): Promise<void> {
  const row = await page.getByTestId('reader-chips').boundingBox();
  await page.screenshot({ path: `shots/${name}.png`, clip: { x: 0, y: 0, width: 390, height: row!.y + row!.height } });
}

/** Verses 1 to 3, as one picture: the box from the top of verse 1 to the bottom of verse 3, in a window as wide as the phone and tall enough to hold them. */
async function shootVerses(page: Page, name: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 1400 });
  const top = await page.locator('[data-verse="1"]').boundingBox();
  const bottom = await page.locator('[data-verse="3"]').boundingBox();
  expect(top && bottom).toBeTruthy();
  await page.screenshot({ path: `shots/${name}.png`, clip: { x: 0, y: top!.y, width: 390, height: bottom!.y + bottom!.height - top!.y } });
  await page.setViewportSize({ width: 390, height: 844 });
}

test('Revelation 3:1-3 with Variants Off and On, in English, Weave and Greek, and the variants chip', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3&weave=solid');
  await expect(page.locator('[data-verse="3"] [data-text]')).toBeVisible();

  // Off: the chip is there, dim, and the text has no mark and no brace
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page)).toHaveText(/^⁑ \d+$/);
  const box = await chip(page).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390.5);
  // as tall as every chip of the row (the 40 px row less its bottom border, src/chipStyle.ts) and at least a thumb wide
  expect(box!.height).toBeGreaterThanOrEqual(38.5);
  expect(box!.width).toBeGreaterThanOrEqual(43.5);
  await shootTop(page, 'variants-header-off');
  for (const view of VIEWS) {
    await choice(page, view).click();
    await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-brace], [data-variant]')).toHaveCount(0);
    await shootVerses(page, `variants-${view.toLowerCase()}-off`);
  }

  // A tap turns Variants on: Those that change the English, the first time
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await shootTop(page, 'variants-header-on');
  for (const view of VIEWS) {
    await choice(page, view).click();
    await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
    const braces = page.locator('[data-verse="2"] [data-brace]');
    await expect(braces.first()).toBeVisible();
    // the brace is a 44 px tap target that costs the line nothing, and it stands inside the frame
    const brace = await braces.first().boundingBox();
    expect(brace!.height).toBeGreaterThanOrEqual(43.5);
    expect(brace!.x + brace!.width).toBeLessThanOrEqual(390.5);
    await expect(page.locator('[data-verse="2"] [data-variant]').first()).toBeVisible();
    await expect(braces.first().locator('[data-witness]').first()).toHaveText(/^(B|NA|ECM)$/);
    await shootVerses(page, `variants-${view.toLowerCase()}-on`);
  }
  // English holds the English of the reading, Greek the Greek
  await choice(page, 'English').click();
  await expect(page.locator('[data-verse="2"] [data-brace]').first()).toHaveAttribute('data-brace-lang', 'english');
  await expect(page.locator('[data-verse="2"] [data-brace] [data-brace-text]').first()).toHaveText('keep');
  await choice(page, 'Greek').click();
  await expect(page.locator('[data-verse="2"] [data-brace]').first()).toHaveAttribute('data-brace-lang', 'greek');
  await expect(page.locator('[data-verse="2"] [data-brace] [data-brace-text]').first()).toHaveText('τήρησον');

  // the dark theme
  await page.emulateMedia({ colorScheme: 'dark' });
  await choice(page, 'English').click();
  await shootVerses(page, 'variants-on-dark');
  await page.emulateMedia({ colorScheme: 'light' });

  // a long press opens the filter sheet; Weave's own long press still flips the word order
  await holdFor(page, chip(page), 700);
  const sheet = page.getByRole('dialog', { name: 'Variants' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Variants in Settings' })).toBeVisible();
  await shot(page, 'variants-sheet');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
  await holdFor(page, choice(page, 'Weave'), 700);
  await expect(page.getByRole('status').filter({ hasText: 'Greek word order' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Variants' })).toHaveCount(0);

  await shot(page, 'variants');
});
