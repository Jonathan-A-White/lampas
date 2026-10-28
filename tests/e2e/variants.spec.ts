// The Reader's variants (mw-9ji6ek0.5) at 390x844: Revelation 3:1-3 in English, Weave and Greek with Variants Off (as the text was) and On (the unit's words marked,
// a brace after them with the other reading and its witness chip), and the variants chip Off and On in the chips row under English | Weave | Greek (the header's own
// line is full at 390 px). A tap on the chip turns Variants on; a long press opens the filter sheet. Shots: shots/variants-<view>-<off|on>.png (verses 1 to 3, in a
// window made tall enough to hold them), variants-header-<off|on>.png (the header and the chips row), variants-sheet.png, variants-on-dark.png, and the whole page last.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { talkField } from './talk-field';
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
  // the sheet and its backdrop have finished coming in (src/index.css lp-sheet-in, lp-fade-in)
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await shot(page, 'variants-sheet');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
  await holdFor(page, choice(page, 'Weave'), 700);
  await expect(page.getByRole('status').filter({ hasText: 'Greek word order' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Variants' })).toHaveCount(0);

  await shot(page, 'variants');
});

// A tap on a brace opens the unit's sheet (mw-9ji6ek0.6, src/reader/VariantSheet.tsx): the text's reading and the other reading(s), each in Greek and English, the witness of
// each spelled out, Ask the tutor, and Back closes it. Shot: shots/variants-brace-sheet.png.
test('a tap on the brace at Revelation 3:2 opens the sheet with both readings and the witness lines; Ask the tutor opens the verse talk; Back closes it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await choice(page, 'Greek').click();
  const brace = page.locator('[data-verse="2"] [data-brace]').first();
  await expect(brace).toBeVisible();
  await expect(brace.locator('[data-brace-text]').first()).toHaveText('τήρησον');
  await brace.click();

  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { level: 2 })).toContainText('Revelation 3:2');
  const readings = sheet.locator('[data-variant-reading]');
  expect(await readings.count()).toBeGreaterThanOrEqual(2);
  // the text's own reading, then the other: each in Greek and in English
  await expect(readings.first().locator('[data-reading-greek]')).toHaveText(/\S/);
  await expect(readings.first().locator('[data-reading-english]')).toHaveText(/\S/);
  await expect(readings.nth(1).locator('[data-reading-greek]')).toHaveText('τήρησον');
  await expect(readings.nth(1).locator('[data-reading-english]')).toHaveText('keep');
  // the witness spelled out, one line each
  const lines = sheet.locator('[data-witness-line]');
  expect(await lines.count()).toBeGreaterThanOrEqual(1);
  for (const line of await lines.allTextContents()) {
    expect(line).toMatch(/^(B: the Byzantine text is split here|NA27\/NA28: Nestle-Aland reads this|NA27: Nestle-Aland \(27th edition\) reads this|NA28: Nestle-Aland \(28th edition\) reads this|ECM: the Editio Critica Maior reads this)$/);
  }
  await expect(sheet.getByRole('button', { name: 'Ask the tutor' })).toBeVisible();
  // the sheet and its backdrop have finished coming in (src/index.css lp-sheet-in, lp-fade-in)
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await shot(page, 'variants-brace-sheet');

  // Back closes it
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[data-verse="2"] [data-brace]').first()).toBeVisible();

  // Ask the tutor opens the verse's talk, as the Verse view's Ask does
  await brace.click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Ask the tutor' }).click();
  await expect(sheet).toHaveCount(0);
  const talk = page.getByRole('dialog', { name: 'Talk about Revelation 3:2' });
  await expect(talk).toBeVisible();
  // the question is ready to send in its box (mw-9ji6ek0.7)
  await expect(await talkField(talk)).toHaveValue('What is the difference, and does it change the sense?');
});
