// tests/e2e/back-step.spec.ts — a header back button (‹ About, ‹ Settings) steps back through the history it came by (mw-5r3p30.458), so the phone's
// Back after it leaves the screen he is on instead of returning to the one he just left. A screen opened some other way (no such entry behind it) is
// still opened afresh by its back button.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const heading = (page: Page, name: string) => page.getByRole('heading', { name, level: 1 });

test('About > Your requests > ‹ About, then the phone Back, leaves About for the Reader', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = '#/about';
  });
  await expect(heading(page, 'About')).toBeVisible();

  await page.getByRole('button', { name: 'Your requests', exact: true }).click();
  await expect(heading(page, 'Your requests')).toBeVisible();
  await page.getByRole('button', { name: '‹ About' }).click();
  await expect(heading(page, 'About')).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(heading(page, 'About')).toHaveCount(0);
  await shot(page, 'back-step');
});

test('a back button on a screen opened by a link still opens the screen it names', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/requests?from=about');
  await expect(heading(page, 'Your requests')).toBeVisible();
  await page.getByRole('button', { name: '‹ About' }).click();
  await expect(heading(page, 'About')).toBeVisible();
});
