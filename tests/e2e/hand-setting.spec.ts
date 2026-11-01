// tests/e2e/hand-setting.spec.ts — Settings > Reading > Layout > Hand (mw-5r3p30.879, kept by mw-5r3p30.882 when the Tutor door setting went: the floating ? is the one door).
// At 390 x 844: Right to start; the choice is kept after a reload and the floating ? goes to that side at once.
import { expect, test } from '@playwright/test';
import { openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('Hand is in Layout, Right to start; Left moves the floating ? to the left edge and is kept after a reload', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/settings');
  await openGroup(page, 'Reading');
  const hand = page.getByRole('group', { name: 'Hand', exact: true });
  await hand.scrollIntoViewIfNeeded();
  await expect(hand.getByRole('button', { name: 'Right', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['Left', 'Right']) {
    const box = await hand.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await hand.getByRole('button', { name: 'Left', exact: true }).click();
  await expect(hand.getByRole('button', { name: 'Left', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'hand-setting');

  // the floating ? goes to that side at once, and the choice is kept
  await page.goto('/');
  const ask = page.getByRole('button', { name: 'Ask the tutor about what is on screen', exact: true });
  await expect(ask).toBeVisible();
  const left = await ask.boundingBox();
  expect((left?.x ?? 999) + (left?.width ?? 0) / 2).toBeLessThan(VIEWPORT.width / 2);

  await page.goto('/#/settings');
  await page.reload();
  await openGroup(page, 'Reading');
  await expect(page.getByRole('group', { name: 'Hand', exact: true }).getByRole('button', { name: 'Left', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
