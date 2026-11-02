// tests/e2e/devices-page.ts — the stubbed Postern and the Licence page of a site-licensed phone, for tests/e2e/my-devices.spec.ts and the floating ? over its confirm (tests/e2e/tutor-door-overlays.spec.ts).
import { expect, type Page, type Route } from '@playwright/test';
import { SEED_PUBLIC_KEY, refuseChain, seedDeviceKey } from './unlocked';

// My devices (mw-cvwm1u.5): a phone licensed by the site issuer lists the devices of its licence on the Licence page, with Rename and Remove. Postern is
// stubbed at the network layer: GET /api/challenge, the signed GET /api/register/person, PATCH and DELETE /api/register/device. The chain is refused, as in
// every licence spec, so the licence is the offline grace's held memory; it names its issuer, as a found mint does (tests/unit/licence-cache.test.ts).
export const OTHER_KEY = '03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};
export const SITE_ISSUER = '03' + '44'.repeat(32);

interface Device {
  key: string;
  name: string;
  addedAt: string;
  lastSeen?: string;
}

export interface Backend {
  devices: Device[];
  listed: string[];
  authorization: string[];
  renamed: unknown[];
  removed: unknown[];
}

export async function stubBackend(page: Page): Promise<Backend> {
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

export async function openLicencePage(page: Page, issuer: string | null): Promise<void> {
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

