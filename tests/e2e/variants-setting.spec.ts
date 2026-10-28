import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Reading > Variants (mw-9ji6ek0.4): the choice of which differences between the manuscripts to show, and the Witnesses row under it, drawn only while Variants is
// not Off; a choice is kept across a reload. A phone-width layout claim: the long label 'Those that change the English' wraps inside the frame at 390x844.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('Variants offers three choices, the Witnesses row follows it, and Byzantine splits only survives a reload', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  const variants = page.getByRole('group', { name: 'Variants', exact: true });
  await expect(variants).toBeVisible();
  await variants.scrollIntoViewIfNeeded();
  await expect(variants.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Witnesses', exact: true })).toHaveCount(0);

  await variants.getByRole('button', { name: 'Those that change the English', exact: true }).click();
  await expect(variants.getByRole('button', { name: 'Those that change the English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const witnesses = page.getByRole('group', { name: 'Witnesses', exact: true });
  await expect(witnesses).toBeVisible();
  await expect(witnesses.getByRole('button', { name: 'also ECM', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const box = await variants.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await shot(page, 'variants-setting');

  await witnesses.getByRole('button', { name: 'Byzantine splits only', exact: true }).click();
  await expect(witnesses.getByRole('button', { name: 'Byzantine splits only', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByRole('group', { name: 'Variants', exact: true }).getByRole('button', { name: 'Those that change the English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Witnesses', exact: true }).getByRole('button', { name: 'Byzantine splits only', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
