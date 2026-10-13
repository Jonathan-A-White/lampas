import { expect, test } from '@playwright/test';
import { refuseChain, seedDeviceKey } from './unlocked';

// The Licence page (the Unlock screen as a page of the app, headed Licence) on a tall phone has room above its status and is not top-heavy (mw-5r3p30.183): the .screen box's 140 px floor under its last row is
// for the round Ask button, which Unlock does not have, so the content started flush at the top and 150 px stayed empty under the version line.
test('Licence page at 390x844: room above the status, fits without scrolling, centred', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Licence' })).toBeVisible();

  const main = page.locator('main.screen');
  const box = (await main.boundingBox())!;
  const status = (await page.getByRole('status').boundingBox())!;
  const version = (await page.getByTestId('build-version').boundingBox())!;

  // the root pads the phone's own safe-area top, which is 0 here, so the box's top is the safe-area top
  expect(status.y - box.y).toBeGreaterThanOrEqual(24);
  const fits = await main.evaluate((el) => el.scrollHeight <= el.clientHeight);
  expect(fits).toBe(true);

  const above = status.y - box.y;
  const below = box.y + box.height - (version.y + version.height);
  expect(Math.abs(above - below)).toBeLessThan(48);
});
