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

// mw-5r3p30.631: the last three header back buttons (Placement's '‹ Goal' / '‹ Settings', an open Paradigms table's '‹ Paradigms') stepped forward too.

/** The Reader opened, then `hashes` visited in order, each a new history step (as a tap on the screen's own button pushes). */
async function visit(page: Page, hashes: string[]) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  for (const hash of hashes) {
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash);
  }
}

test('Goal > Placement > ‹ Goal, then the phone Back, leaves Goal for the Reader', async ({ page }) => {
  await visit(page, ['#/goal', '#/placement?from=goal']);
  await expect(heading(page, 'Placement')).toBeVisible();
  await page.getByRole('button', { name: '‹ Goal' }).click();
  await expect(heading(page, 'Goal')).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(heading(page, 'Goal')).toHaveCount(0);
  await expect(heading(page, 'Placement')).toHaveCount(0);
});

test('Settings > Placement > ‹ Settings, then the phone Back, leaves Settings for the Reader', async ({ page }) => {
  await visit(page, ['#/settings', '#/placement']);
  await expect(heading(page, 'Placement')).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings' }).click();
  await expect(heading(page, 'Settings')).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(heading(page, 'Settings')).toHaveCount(0);
  await expect(heading(page, 'Placement')).toHaveCount(0);
});

test('Paradigms > a table > ‹ Paradigms, then the phone Back, leaves Paradigms for the Reader', async ({ page }) => {
  await visit(page, ['#/paradigms']);
  await expect(heading(page, 'Paradigms')).toBeVisible();
  await page.locator('[data-paradigm="article"]').click();
  await expect(page.locator('[data-paradigm="article"]')).toHaveCount(0);
  await page.getByRole('button', { name: '‹ Paradigms' }).click();
  await expect(heading(page, 'Paradigms')).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(heading(page, 'Paradigms')).toHaveCount(0);
});

test('Placement and a Paradigms table opened by a link still go to their screen from their back button', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/placement?from=goal');
  await expect(heading(page, 'Placement')).toBeVisible();
  await page.getByRole('button', { name: '‹ Goal' }).click();
  await expect(heading(page, 'Goal')).toBeVisible();

  await page.goto('/#/placement');
  await expect(heading(page, 'Placement')).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings' }).click();
  await expect(heading(page, 'Settings')).toBeVisible();

  await page.goto('/#/paradigms?t=article');
  await page.getByRole('button', { name: '‹ Paradigms' }).click();
  await expect(heading(page, 'Paradigms')).toBeVisible();
  await expect(page.locator('[data-paradigm="article"]')).toBeVisible();
});
