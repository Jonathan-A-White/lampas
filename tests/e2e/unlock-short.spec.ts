import { expect, test } from '@playwright/test';
import { refuseChain, seedDeviceKey } from './unlocked';

// The Unlock screen centres when it fits and scrolls from its top when it does not (mw-5r3p30.176): the QR made it taller than a short
// phone, and justify-center spilled the icon and title above the top, where no scroll reaches.
const SIZES = [
  { name: '360x640', width: 360, height: 640 },
  { name: '320x568', width: 320, height: 568 },
  { name: '844x390 (landscape)', width: 844, height: 390 },
  { name: '390x844', width: 390, height: 844 },
];

for (const { name, width, height } of SIZES) {
  test(`Unlock at ${name}: every part is reachable from the top`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await refuseChain(page);
    await seedDeviceKey(page);
    await page.goto('/');
    const heading = page.getByRole('heading', { name: 'Unlock' });
    await expect(heading).toBeVisible();

    await page.locator('main.screen').evaluate((el) => el.scrollTo(0, 0));
    const icon = await page.locator('main.screen img[width="72"]').boundingBox();
    const title = await heading.boundingBox();
    const status = await page.getByRole('status').boundingBox();
    expect(icon!.y).toBeGreaterThanOrEqual(0);
    expect(title!.y).toBeGreaterThanOrEqual(0);
    expect(status!.y).toBeGreaterThanOrEqual(0);

    // the QR and Copy come into view by scrolling
    for (const target of [
      page.getByRole('img', { name: 'This phone’s key as a QR code' }),
      page.getByRole('button', { name: 'Copy', exact: true }),
    ]) {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }

    if (height >= 844) {
      // the tall phone: the QR, the key and Copy are all in view with no scrolling
      await page.locator('main.screen').evaluate((el) => el.scrollTo(0, 0));
      const copy = await page.getByRole('button', { name: 'Copy', exact: true }).boundingBox();
      const key = await page.getByTestId('device-key').boundingBox();
      expect(key!.y).toBeGreaterThan(icon!.y);
      expect(copy!.y + copy!.height).toBeLessThanOrEqual(height);
    }
  });
}
