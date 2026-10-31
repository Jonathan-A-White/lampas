// The key to the marks of a variant brace (mw-9ji6ek0.43) at 360x640 and 390x844: on a fresh profile Revelation 10 in the Weave, with Variants On, shows one quiet line under the chips row with a sample
// of each look and the witness letters (once the card that offers the lessons is answered: one note at a time); it fits the width and covers no text (the text starts below it); 'What the marks mean' on it and the opening brace of any variant open the sheet at any time, whose
// link opens the lesson 'Where the English comes from'; the × puts the line away for every chapter, also after a reload. Shots: shots/variant-key-<width>.png and variant-key-sheet-<width>.png.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const line = (page: Page) => page.getByTestId('variant-key-line');
const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'What the marks in a brace mean' });

for (const [width, height] of [[360, 640], [390, 844]] as const) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true });

    test('the key line shows once, fits, opens the sheet from a brace and is put away for good', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=rev&c=10&weave=solid');
      await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
      await expect(line(page)).toHaveCount(0);

      await chip(page).click();
      await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
      // one note at a time: the card that offers the lessons comes first, the key under it once that is answered
      await expect(page.getByTestId('variant-lessons-offer')).toBeVisible();
      await expect(line(page)).toHaveCount(0);
      await page.getByTestId('variant-lessons-offer').getByRole('button', { name: 'Read the lessons', exact: true }).click();
      await expect(page).toHaveURL(/#\/lessons\/variants$/);
      await page.goto('/#/?b=rev&c=10&weave=solid');
      await expect(line(page)).toBeVisible();
      await expect(line(page)).toContainText('Lampas’s English');
      await expect(line(page)).toContainText('the MSB’s footnote');
      await expect(line(page)).toContainText('which Greek text reads it');
      for (const sample of ['lampas', 'msb']) await expect(line(page).getByTestId(`variant-key-sample-${sample}`)).toBeVisible();

      // it fits the width, sits under the chips row, and the text starts below it
      const frame = (await line(page).boundingBox())!;
      const row = (await page.getByTestId('reader-chips').boundingBox())!;
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.width).toBeLessThanOrEqual(width + 0.5);
      expect(frame.y).toBeGreaterThanOrEqual(row.y + row.height - 1);
      const text = (await page.locator('[data-reader]').boundingBox())!;
      expect(text.y).toBeGreaterThanOrEqual(frame.y + frame.height - 1);
      await expect(page.getByRole('button', { name: 'What the marks mean' }).first()).toBeVisible();
      await shot(page, `variant-key-${width}`);

      // a brace opens the key in one tap, whenever he likes
      const brace = page.locator('[data-brace-key]').first();
      await brace.scrollIntoViewIfNeeded();
      await brace.click();
      await expect(sheet(page)).toBeVisible();
      await expect(sheet(page).getByTestId('variant-key-sample-lampas')).toBeVisible();
      await expect(sheet(page).getByTestId('variant-key-sample-msb')).toBeVisible();
      for (const name of ['NA', 'B', 'ECM', 'RP']) await expect(sheet(page).locator('[data-key-chip]', { hasText: new RegExp(`^${name}$`) })).toBeVisible();
      await shot(page, `variant-key-sheet-${width}`);
      await sheet(page).getByRole('button', { name: 'Done' }).click();
      await expect(sheet(page)).toHaveCount(0);

      // its link opens the lesson
      await line(page).getByRole('button', { name: 'What the marks mean' }).click();
      await sheet(page).getByRole('button', { name: 'Where the English comes from, in the lessons' }).click();
      await expect(page).toHaveURL(/#\/lessons\/variants\/4$/);
      await page.goto('/#/?b=rev&c=10&weave=solid');
      await expect(line(page)).toBeVisible();

      // put away: gone on every chapter and after a reload; the brace still opens the key
      await line(page).getByRole('button', { name: 'Put the key away' }).click();
      await expect(line(page)).toHaveCount(0);
      await page.reload();
      await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
      await expect(line(page)).toHaveCount(0);
      await page.goto('/#/?b=rev&c=3');
      await expect(page.locator('[data-verse="3"] [data-text]')).toBeVisible();
      await expect(line(page)).toHaveCount(0);
      await page.locator('[data-brace-key]').first().click();
      await expect(sheet(page)).toBeVisible();
    });
  });
}
