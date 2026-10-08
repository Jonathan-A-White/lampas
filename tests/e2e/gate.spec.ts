import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { SEED_PUBLIC_KEY, refuseChain, seedDeviceKey } from './unlocked';

test('a phone with no licence sees Unlock with its key, a Copy and nothing scrolling', async ({ page }) => {
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Unlock' })).toBeVisible();
  await expect(page.getByTestId('device-key')).toHaveText(SEED_PUBLIC_KEY);
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lampas' })).toHaveCount(0);

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);

  await shot(page, 'unlock');
});
