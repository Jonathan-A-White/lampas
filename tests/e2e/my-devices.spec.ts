import { expect, test, type Page, type Route } from '@playwright/test';
import { shot } from './shot';
import { SEED_PUBLIC_KEY, refuseChain, seedDeviceKey } from './unlocked';

// My devices (mw-cvwm1u.5): a phone licensed by the site issuer lists the devices of its licence on the Licence page, with Rename and Remove. Postern is
// stubbed at the network layer: GET /api/challenge, the signed GET /api/register/person, PATCH and DELETE /api/register/device. The chain is refused, as in
// every licence spec, so the licence is the offline grace's held memory; it names its issuer, as a found mint does (tests/unit/licence-cache.test.ts).
const OTHER_KEY = '03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};
const SITE_ISSUER = '03' + '44'.repeat(32);

interface Device {
  key: string;
  name: string;
  addedAt: string;
  lastSeen?: string;
}

interface Backend {
  devices: Device[];
  listed: string[];
  authorization: string[];
  renamed: unknown[];
  removed: unknown[];
}

async function stubBackend(page: Page): Promise<Backend> {
  const backend: Backend = {
    devices: [
      { key: SEED_PUBLIC_KEY, name: 'Pixel', addedAt: '2026-10-10T12:00:00Z', lastSeen: '2026-10-18T12:00:00Z' },
      { key: OTHER_KEY, name: 'Old tablet', addedAt: '2026-10-12T12:00:00Z' },
    ],
    listed: [],
    authorization: [],
    renamed: [],
    removed: [],
  };
  const json = (route: Route, status: number, body: object) =>
    route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  await page.route('**/api/challenge', (route) => (route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: CORS }) : json(route, 200, { nonce: 'ab'.repeat(32) })));
  await page.route('**/api/register/person?*', (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    backend.listed.push(new URL(request.url()).searchParams.get('key') ?? '');
    backend.authorization.push(request.headers()['authorization'] ?? '');
    return json(route, 200, { known: true, personId: 'p1', keys: backend.devices.map((d) => d.key), devices: backend.devices, dailyLimit: 50 });
  });
  await page.route('**/api/register/device', (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = request.postDataJSON() as { deviceKey: string; name?: string };
    if (request.method() === 'PATCH') {
      backend.renamed.push(body);
      backend.devices = backend.devices.map((d) => (d.key === body.deviceKey ? { ...d, name: body.name ?? d.name } : d));
    } else {
      backend.removed.push(body);
      backend.devices = backend.devices.filter((d) => d.key !== body.deviceKey);
    }
    return json(route, 200, { personId: 'p1', devices: backend.devices });
  });
  return backend;
}

async function openLicencePage(page: Page, issuer: string | null): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await refuseChain(page);
  await seedDeviceKey(page);
  // a licensed reader is welcomed by the tutor and offered a tip on opening (src/Welcome.tsx, src/tips/offer.ts): this spec is about neither
  await page.addInitScript(() => {
    const day = new Date();
    const two = (n: number) => String(n).padStart(2, '0');
    window.localStorage.setItem('lampas.welcome', 'done');
    window.localStorage.setItem('lampas.tipsDay', `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`);
    window.localStorage.setItem('lampas.settleMs', '0');
  });
  if (issuer !== null) {
    await page.addInitScript(
      ([publicKeyHex, signedBy]) => window.localStorage.setItem('lampas.licenceHeld', JSON.stringify({ publicKeyHex, at: Date.now() - 60_000, issuer: signedBy })),
      [SEED_PUBLIC_KEY, issuer] as const,
    );
  }
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Licence', exact: true, level: 1 })).toBeVisible();
}

async function expectFitsPhone(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  for (const input of await page.locator('main input:visible').all()) {
    expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  for (const button of await page.locator('main button:visible, [role="alertdialog"] button:visible').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

const devices = (page: Page) => page.getByRole('region', { name: 'My devices' });

test('a site-licensed phone lists its devices by name and last use, signed by its own key', async ({ page }) => {
  const backend = await stubBackend(page);
  await openLicencePage(page, SITE_ISSUER);
  const list = devices(page);
  await expect(list.getByRole('listitem')).toHaveCount(2);
  const pixel = list.getByRole('listitem', { name: 'Pixel', exact: true });
  await expect(pixel).toContainText('this phone');
  await expect(pixel).toContainText('Last used 18 Oct 2026');
  const tablet = list.getByRole('listitem', { name: 'Old tablet' });
  await expect(tablet).not.toContainText('this phone');
  await expect(tablet).toContainText('Last used 12 Oct 2026');
  await expect(list).toContainText('A new phone joins this licence: tap Get a licence there and use the same phone number.');
  expect(backend.listed).toEqual([SEED_PUBLIC_KEY]);
  expect(backend.authorization[0]).toMatch(new RegExp(`^Postern2 ${SEED_PUBLIC_KEY}:${'ab'.repeat(32)}:[0-9a-f]+$`));
  await expectFitsPhone(page);
  await shot(page, 'my-devices');
});

test('Remove on the other device asks first, then the list has one', async ({ page }) => {
  const backend = await stubBackend(page);
  await openLicencePage(page, SITE_ISSUER);
  await devices(page).getByRole('button', { name: 'Remove Old tablet' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Lampas on that device loses its licence');
  await expectFitsPhone(page);
  await shot(page, 'my-devices-confirm');
  expect(backend.removed).toEqual([]);
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(devices(page).getByRole('listitem')).toHaveCount(1);
  await expect(devices(page).getByRole('listitem', { name: 'Pixel', exact: true })).toBeVisible();
  expect(backend.removed).toEqual([{ deviceKey: OTHER_KEY, personId: 'p1' }]);
  await expect(page.getByRole('status').getByText('Licensed', { exact: true })).toBeVisible();
});

test('Keep leaves both devices', async ({ page }) => {
  const backend = await stubBackend(page);
  await openLicencePage(page, SITE_ISSUER);
  await devices(page).getByRole('button', { name: 'Remove Old tablet' }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(devices(page).getByRole('listitem')).toHaveCount(2);
  expect(backend.removed).toEqual([]);
});

test('Remove on this phone returns it to Not licensed', async ({ page }) => {
  const backend = await stubBackend(page);
  await openLicencePage(page, SITE_ISSUER);
  await devices(page).getByRole('button', { name: 'Remove Pixel' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Lampas on this phone loses its licence');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('status').getByText('Not licensed')).toBeVisible();
  await expect(devices(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Get a licence' })).toBeVisible();
  expect(backend.removed).toEqual([{ deviceKey: SEED_PUBLIC_KEY, personId: 'p1' }]);
  await shot(page, 'my-devices-removed-this-phone');
});

test('Rename sends PATCH {deviceKey, name} and shows the new name', async ({ page }) => {
  const backend = await stubBackend(page);
  await openLicencePage(page, SITE_ISSUER);
  await devices(page).getByRole('button', { name: 'Rename Old tablet' }).click();
  const field = page.getByLabel('Device name');
  await expect(field).toHaveValue('Old tablet');
  await expectFitsPhone(page);
  await field.fill('Kitchen tablet');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(devices(page).getByRole('listitem', { name: 'Kitchen tablet' })).toBeVisible();
  expect(backend.renamed).toEqual([{ deviceKey: OTHER_KEY, name: 'Kitchen tablet' }]);
  // it persists: the backend holds it, and the next visit lists it
  await page.reload();
  await expect(devices(page).getByRole('listitem', { name: 'Kitchen tablet' })).toBeVisible();
});

test('the backend’s refusal of a rename is shown in its own words', async ({ page }) => {
  await stubBackend(page);
  await page.route('**/api/register/device', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({ status: 404, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'that device is not on this licence' }) }),
  );
  await openLicencePage(page, SITE_ISSUER);
  await devices(page).getByRole('button', { name: 'Rename Old tablet' }).click();
  await page.getByLabel('Device name').fill('Kitchen tablet');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('that device is not on this licence');
});

test('a licence from the Governor’s own issuer shows no My devices', async ({ page }) => {
  const backend = await stubBackend(page);
  const governor = '035666d4ea414a65801ac092a4e28be6515065adcc7ac58d9cc76db8d5597f44c4';
  await openLicencePage(page, governor);
  await expect(page.getByRole('status').getByText('Licensed', { exact: true })).toBeVisible();
  await expect(devices(page)).toHaveCount(0);
  await expect(page.getByText('My devices')).toHaveCount(0);
  expect(backend.listed).toEqual([]);
  await shot(page, 'my-devices-governor');
});
