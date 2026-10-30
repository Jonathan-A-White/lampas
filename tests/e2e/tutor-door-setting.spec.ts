// tests/e2e/tutor-door-setting.spec.ts — Settings > The tutor > Asking the tutor > Tutor door and Settings > Reading > Layout > Hand (mw-5r3p30.879, part A of mw-5r3p30.843).
// At 390 x 844: Two-finger tap is chosen to start; Floating ? asks "Which hand do you hold your phone in?" once; the answer is kept as Hand, which can be changed in Layout; both stay after a reload.
import { expect, test } from '@playwright/test';
import { openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const QUESTION = 'Which hand do you hold your phone in?';

test('Tutor door and Hand: Floating ? asks the hand once, both are kept after a reload', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/settings');
  await openGroup(page, 'The tutor');

  const door = page.getByRole('group', { name: 'Tutor door', exact: true });
  await door.scrollIntoViewIfNeeded();
  await expect(door.getByRole('button', { name: 'Two-finger tap', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: QUESTION })).toHaveCount(0);

  await door.getByRole('button', { name: 'Floating ?', exact: true }).click();
  await expect(door.getByRole('button', { name: 'Floating ?', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const question = page.getByRole('group', { name: QUESTION });
  await question.scrollIntoViewIfNeeded();
  await expect(question).toBeVisible();
  for (const button of [door.getByRole('button', { name: 'Floating ?', exact: true }), question.getByRole('button', { name: 'Left', exact: true }), question.getByRole('button', { name: 'Right', exact: true })]) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await shot(page, 'tutor-door-hand-question');

  await question.getByRole('button', { name: 'Left', exact: true }).click();
  await expect(page.getByRole('group', { name: QUESTION })).toHaveCount(0);

  // both are kept: the door and, in Layout, the hand
  await page.reload();
  await expect(page.getByRole('group', { name: 'Tutor door', exact: true }).getByRole('button', { name: 'Floating ?', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: QUESTION })).toHaveCount(0);

  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await openGroup(page, 'Reading');
  const hand = page.getByRole('group', { name: 'Hand', exact: true });
  await hand.scrollIntoViewIfNeeded();
  await expect(hand.getByRole('button', { name: 'Left', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await hand.getByRole('button', { name: 'Right', exact: true }).click();
  await expect(hand.getByRole('button', { name: 'Right', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'hand-setting');

  await page.reload();
  await expect(page.getByRole('group', { name: 'Hand', exact: true }).getByRole('button', { name: 'Right', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
