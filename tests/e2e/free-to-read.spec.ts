import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { SEED_PUBLIC_KEY, openUnlicensed, refuseChain, seedDeviceKey } from './unlocked';

// Lampas is free to read (mw-8m9dyu.1): a phone with no licence, and nothing done to get past a gate (no openUnlocked), reaches the Reader.
test('a phone with no licence opens on the Reader at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unlock' })).toHaveCount(0);
  await expect(page.getByTestId('device-key')).toHaveCount(0);
  await shot(page, 'free-to-read');
});

test('a shared verse link opens that verse for a phone with no licence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.goto('/#/?ref=Rom.8.28');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await expect(page.locator('[data-verse="28"]').first()).toHaveAttribute('data-selected', 'true');
});

test('the Unlock page, #/unlock, shows the phone’s key and says it has no licence', async ({ page }) => {
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Unlock' })).toBeVisible();
  await expect(page.getByTestId('device-key')).toHaveText(SEED_PUBLIC_KEY);
  await expect(page.getByText('Can’t reach the chain')).toBeVisible();
});
