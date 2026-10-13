import { expect, test } from '@playwright/test';
import { refuseChain, seedDeviceKey } from './unlocked';

// The Unlock screen on a tall phone has room above the icon and is not top-heavy (mw-5r3p30.183): the .screen box's 140 px floor under its last row is
// for the round Ask button, which Unlock does not have, so the content started flush at the top and 150 px stayed empty under the version line.
test('Unlock at 390x844: room above the icon, fits without scrolling, centred', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Unlock' })).toBeVisible();

  const main = page.locator('main.screen');
  const box = (await main.boundingBox())!;
  const icon = (await page.locator('main.screen img[width="72"]').boundingBox())!;
  const version = (await page.getByTestId('build-version').boundingBox())!;

  // the root pads the phone's own safe-area top, which is 0 here, so the box's top is the safe-area top
  expect(icon.y - box.y).toBeGreaterThanOrEqual(24);
  const fits = await main.evaluate((el) => el.scrollHeight <= el.clientHeight);
  expect(fits).toBe(true);

  const above = icon.y - box.y;
  const below = box.y + box.height - (version.y + version.height);
  expect(Math.abs(above - below)).toBeLessThan(48);
});
