import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { switchOnResources, shelveLexicons } from './long-library';

test.use({ hasTouch: true, viewport: { width: 412, height: 915 } });

// His screenshot of 2026-10-09 (mw-5r3p30.132): on the word sheet of κατάκριμα the tip card sat at the top of the content and the English
// heading 'condemnation' peeked out half hidden beneath it. The tip takes its own space above the heading, and the heading its own, which
// the facts' box never scrolls under: the heading is wholly in view with the tip up, however far the facts are scrolled.

async function openSheet(page: Page, options: { long: boolean }) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  if (options.long) {
    // a long sheet: 21 lexicons On and three pinned, with Strong's and Accordance, is 7 tiles
    await switchOnResources(page);
    await shelveLexicons(page);
  }
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).tap();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  const tip = sheet.getByRole('note');
  const heading = sheet.getByText('“condemnation”');
  await expect(tip).toContainText('Long-press a word to hear it');
  await expect(heading).toBeVisible();
  await page.waitForTimeout(300);
  return { sheet, tip, heading };
}

async function boxOf(locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('no box');
  return box;
}

test('the tip on the word sheet and the English heading do not overlap, and Got it leaves the heading where it was', async ({ page }) => {
  const { tip, heading } = await openSheet(page, { long: false });
  const tipBox = await boxOf(tip);
  const before = await boxOf(heading);
  expect(before.y).toBeGreaterThanOrEqual(tipBox.y + tipBox.height);
  await expect(heading).toBeInViewport({ ratio: 1 });
  await shot(page, 'word-tip-overlap');

  await tip.getByRole('button', { name: 'Got it' }).tap();
  await expect(tip).toHaveCount(0);
  const after = await boxOf(heading);
  expect(after.y).toBe(before.y);
});

test('on a long word sheet the heading stays whole under the tip while the facts scroll, and stays put after Got it', async ({ page }) => {
  const { sheet, tip, heading } = await openSheet(page, { long: true });
  const scroll = sheet.getByTestId('sheet-scroll');
  const tipBox = await boxOf(tip);
  const before = await boxOf(heading);
  expect(before.y).toBeGreaterThanOrEqual(tipBox.y + tipBox.height);

  await scroll.evaluate((el) => { el.scrollTop = 20; });
  await page.waitForTimeout(100);
  const scrolled = await boxOf(heading);
  expect(scrolled.y).toBe(before.y);
  await expect(heading).toBeInViewport({ ratio: 1 });
  // nothing of the facts' box reaches above the heading's foot
  const factsTop = (await boxOf(scroll)).y;
  expect(factsTop).toBeGreaterThanOrEqual(scrolled.y + scrolled.height);
  await shot(page, 'word-tip-overlap-long');

  await tip.getByRole('button', { name: 'Got it' }).tap();
  await expect(tip).toHaveCount(0);
  const after = await boxOf(heading);
  expect(after.y).toBe(before.y);
});
