import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// On a slow connection the passage a round is drawn from arrives late: under the Review header there is a line saying so, never an empty page (mw-86e9r1.28).
test('Review > Start says it is getting the questions while the passage loads', async ({ page }) => {
  await openUnlocked(page);
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/data\/.*\.json/, async (route) => {
    if (route.request().url().endsWith('/data/index.json')) return route.continue();
    await gate;
    await route.continue();
  });
  await page.goto('/#/review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const loading = page.getByRole('status').filter({ hasText: 'Getting your questions…' });
  await expect(loading).toBeVisible();
  await expect(page.getByTestId('prompt')).toHaveCount(0);
  await shot(page, 'review-loading');

  release();
  await expect(page.getByTestId('prompt')).toBeVisible();
  await expect(loading).toHaveCount(0);
});
