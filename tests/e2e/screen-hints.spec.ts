// Tips in place (mw-5r3p30.824) at 390x844: the first open of Goal shows its one-line hint; a tap on Got it dismisses it; after a reload it is not shown again.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test('Goal: the hint is shown, dismissed with Got it, and not shown again after a reload', async ({ page }) => {
  await openUnlocked(page, { hints: true });
  await page.goto('/#/goal');
  const hint = page.locator('[data-hint-card="goal-screen"]');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Tip: ');
  await shot(page, 'screen-hint-goal');
  await hint.getByRole('button', { name: 'Got it' }).click();
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('[data-hint-card]')).toHaveCount(0);
});
