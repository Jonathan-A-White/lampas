import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The phone's screen: the gold word beside the English must not push the verse off it.
test.use({ viewport: { width: 390, height: 844 } });

test("Acts 18:12 in Weave: the gold δὲ stands before 'While', which stays, and nothing runs off the screen (mw-5r3p30.878)", async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=act&c=18&weave=solid');
  const verse = page.locator('[data-verse="12"]');
  await expect(verse).toBeVisible();
  await verse.scrollIntoViewIfNeeded();
  const gold = verse.locator('[data-beside]').first();
  await expect(gold).toHaveText('δὲ');
  await expect(verse.locator('[data-text]')).toContainText(/δὲ\s+While Gallio was proconsul/);
  // gold, in the Greek face, a 44 px target, right before the English it hides in
  expect(await gold.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Gentium Plus');
  expect((await gold.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  const english = verse.locator('[data-chunk="0"]');
  await expect(english).toContainText('While');
  const g = (await gold.boundingBox())!;
  const e = (await english.boundingBox())!;
  expect(g.x).toBeLessThan(e.x);
  expect(await gold.evaluate((el) => getComputedStyle(el).color)).not.toBe(await english.evaluate((el) => getComputedStyle(el).color));
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await gold.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'weave-gloss');
});
