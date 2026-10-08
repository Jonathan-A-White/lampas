import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const scrollTop = (page: Page) => page.locator('[data-reader]').evaluate((el) => el.scrollTop);

test('closing the app and opening it again puts him back, and Back walks the places before', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const first = await context.newPage();
  await openUnlocked(first);
  await first.goto('/');
  await expect(first.locator('[data-verse="1"]')).toBeVisible();

  await first.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(first.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await first.getByRole('button', { name: 'Verse 28', exact: true }).click();
  await expect(first.locator('[data-verse="28"]')).toHaveAttribute('data-selected', 'true');
  await first.locator('[data-reader]').evaluate((el) => (el.scrollTop = 900));
  const left = await scrollTop(first);
  expect(left).toBeGreaterThan(500);
  // the scroll is written to the phone 250 ms after the last scroll event
  await first.waitForTimeout(600);

  await first.getByRole('button', { name: 'Settings', exact: true }).click();
  await first.getByRole('button', { name: 'Words', exact: true }).click();
  await expect(first.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await first.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(first.getByRole('heading', { name: 'Quick test', level: 1 })).toBeVisible();
  await first.close();

  // a new page in the same context: the app was closed and opened from its icon (no address)
  const page = await context.newPage();
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeVisible();
  await shot(page, 'reopen-test');

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await expect(page.locator('[data-verse="28"]')).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => scrollTop(page), { timeout: 5000 }).toBeGreaterThan(left - 5);
  expect(await scrollTop(page)).toBeLessThan(left + 5);
  await shot(page, 'reopen-reader');

  // past the oldest place Back lands on Home: the reader with nothing selected
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
  await context.close();
});

test('a reload keeps him on the same screen, verse and view', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Verse 5', exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-verse="5"]')).toHaveAttribute('data-selected', 'true');
});
