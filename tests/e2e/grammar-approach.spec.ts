import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test('Settings > Grammar approach at phone width: BMA Tutor chosen with its credit, Lampas ladder one tap away, kept across a reload', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const group = page.getByRole('radiogroup', { name: 'Grammar approach' });
  await expect(group).toBeVisible();
  const bma = group.getByRole('radio', { name: 'BMA Tutor' });
  const ladder = group.getByRole('radio', { name: 'Lampas ladder' });
  await expect(bma).toHaveAttribute('aria-checked', 'true');

  for (const radio of [bma, ladder]) {
    const box = await radio.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }

  const credit = page.locator('[data-approach-credit]');
  await expect(credit).toContainText("After the Greek Success Path of Biblical Mastery Academy; the lessons and drills here are Lampas's own.");
  await expect(credit.getByRole('link', { name: 'Biblical Mastery Academy' })).toHaveAttribute('href', /^https:\/\//);
  await expect(page.locator('[data-approach-method]')).toBeVisible();
  await expect(page.locator('[data-next]')).toHaveCount(1);
  expect(await page.locator('[data-approach-method]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // nothing makes the page wider than the phone
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await ladder.click();
  await expect(ladder).toHaveAttribute('aria-checked', 'true');
  await expect(credit).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('radiogroup', { name: 'Grammar approach' }).getByRole('radio', { name: 'Lampas ladder' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'BMA Tutor' }).click();
  await expect(page.locator('[data-approach-credit]')).toBeVisible();
  // the screen scrolls in its own box: bring the section to the top so the shot shows it
  await page.getByRole('heading', { name: 'Grammar approach', level: 2 }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'grammar-approach');
});
