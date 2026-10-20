import { expect, test, type Locator, type Page } from '@playwright/test';
import { SEED_PUBLIC_KEY, refuseChain, seedDeviceKey } from './unlocked';
import { shot } from './shot';

// The Licence page (the Unlock screen as a page of the app, headed Licence) has room above its status and sits centred (mw-5r3p30.183). Since the Licence page said what a licence
// unlocks and gained Get a licence and the key's own line, it is taller than a 844 px phone: it then starts at the top with room above, scrolls in its own .screen box (the page never
// scrolls) and every part is reachable (mw-5r3p30.627). The app's own live region is a second role=status, so the page's status is the one inside main.

async function openLicence(page: Page, height: number): Promise<{ main: Locator; status: Locator }> {
  await page.setViewportSize({ width: 390, height });
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Licence', exact: true })).toBeVisible();
  const main = page.locator('main.screen');
  return { main, status: main.getByRole('status') };
}

test('Licence page at 390x844: room above the status, centred, every part reachable by scrolling', async ({ page }) => {
  const { main, status } = await openLicence(page, 844);
  await expect(status).toContainText('Checking…');

  const box = (await main.boundingBox())!;
  const at = (await status.boundingBox())!;
  // the root pads the phone's own safe-area top, which is 0 here, so the box's top is the safe-area top
  expect(at.y - box.y).toBeGreaterThanOrEqual(24);
  // centred across the box
  expect(Math.abs(at.x + at.width / 2 - (box.x + box.width / 2))).toBeLessThan(2);

  // taller than the box: it scrolls in the box, from its top, and the page itself does not
  const scrolls = await main.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(scrolls).toBe(true);
  expect(await main.evaluate((el) => el.scrollTop)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollTop + document.body.scrollTop)).toBe(0);

  // every part is reachable by scrolling it into the box, and sits whole inside it
  const parts: Locator[] = [
    status,
    page.getByRole('button', { name: 'Get a licence' }),
    page.getByRole('region', { name: 'This phone’s key' }),
    page.getByRole('button', { name: 'Copy', exact: true }),
    page.getByTestId('build-version'),
  ];
  for (const part of parts) {
    await part.scrollIntoViewIfNeeded();
    const inside = await part.boundingBox();
    const now = (await main.boundingBox())!;
    expect(inside!.y).toBeGreaterThanOrEqual(now.y - 1);
    expect(inside!.y + inside!.height).toBeLessThanOrEqual(now.y + now.height + 1);
  }
  // the last part is the foot of the scroll box
  expect(await main.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  await shot(page, 'unlock-room');
});

test('Licence page in a tall window: it fits and is centred between the top and the foot', async ({ page }) => {
  const { main, status } = await openLicence(page, 1400);
  const version = page.getByTestId('build-version');
  await expect(status).toContainText('Checking…');

  expect(await main.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  const box = (await main.boundingBox())!;
  const at = (await status.boundingBox())!;
  const foot = (await version.boundingBox())!;
  const above = at.y - box.y;
  const below = box.y + box.height - (foot.y + foot.height);
  expect(above).toBeGreaterThanOrEqual(24);
  expect(Math.abs(above - below)).toBeLessThan(48);
});

// A phone licensed by the site issuer also has My devices, above the key (mw-cvwm1u.5): it scrolls into the box with the rest. Postern is stubbed as tests/e2e/my-devices.spec.ts does.
test('Licence page of a site-licensed phone at 390x844: My devices and the key with Copy are reachable by scrolling', async ({ page }) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, OPTIONS' };
  const devices = ['Pixel', 'Old tablet', 'Laptop'].map((name, i) => ({ key: i === 0 ? SEED_PUBLIC_KEY : `02${String(i).repeat(64)}`, name, addedAt: '2026-10-10T12:00:00Z' }));
  await page.route('**/api/challenge', (route) =>
    route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ nonce: 'ab'.repeat(32) }) }),
  );
  await page.route('**/api/register/person?*', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: cors })
      : route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ known: true, personId: 'p1', keys: devices.map((d) => d.key), devices, dailyLimit: 50 }) }),
  );
  await page.addInitScript(() => {
    window.localStorage.setItem('lampas.welcome', 'done');
    window.localStorage.setItem('lampas.settleMs', '0');
  });
  await page.addInitScript(
    ([publicKeyHex, issuer]) => window.localStorage.setItem('lampas.licenceHeld', JSON.stringify({ publicKeyHex, at: Date.now() - 60_000, issuer })),
    [SEED_PUBLIC_KEY, '03' + '44'.repeat(32)] as const,
  );
  const { main, status } = await openLicence(page, 844);
  await expect(status).toContainText('Licensed');
  await expect(page.getByRole('region', { name: 'My devices' }).getByRole('listitem')).toHaveCount(3);

  const box = (await main.boundingBox())!;
  expect(((await status.boundingBox())!).y - box.y).toBeGreaterThanOrEqual(24);
  expect(await main.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  expect(await main.evaluate((el) => el.scrollTop)).toBe(0);
  for (const part of [page.getByRole('region', { name: 'My devices' }), page.getByRole('region', { name: 'This phone’s key' }), page.getByRole('button', { name: 'Copy', exact: true })]) {
    await part.scrollIntoViewIfNeeded();
    const inside = (await part.boundingBox())!;
    const now = (await main.boundingBox())!;
    expect(inside.y).toBeGreaterThanOrEqual(now.y - 1);
    expect(inside.y + inside.height).toBeLessThanOrEqual(now.y + now.height + 1);
  }
});
