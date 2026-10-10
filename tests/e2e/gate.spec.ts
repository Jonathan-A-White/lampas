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

  // The QR, the key text and Copy are all on the one 390x844 screen, the QR at least 192 px and above them.
  const qr = page.getByRole('img', { name: 'This phone’s key as a QR code' });
  await expect(qr).toBeVisible();
  const box = await qr.boundingBox();
  const keyBox = await page.getByTestId('device-key').boundingBox();
  const copyBox = await page.getByRole('button', { name: 'Copy', exact: true }).boundingBox();
  const height = page.viewportSize()?.height ?? 844;
  expect(box!.width).toBeGreaterThanOrEqual(192);
  expect(box!.height).toBeGreaterThanOrEqual(192);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(keyBox!.y);
  expect(keyBox!.y + keyBox!.height).toBeLessThanOrEqual(copyBox!.y);
  expect(copyBox!.y + copyBox!.height).toBeLessThanOrEqual(height);
  await expect(page.getByTestId('build-version')).toHaveText(/^v\d+\.\d+\.\d+ · /);
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
