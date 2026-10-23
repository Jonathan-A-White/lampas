import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { SEED_PUBLIC_KEY, refuseChain, seedDeviceKey } from './unlocked';

// Get a licence (mw-cvwm1u.4): the Licence page of a phone with no licence explains what a licence unlocks and takes an email, a phone and two codes. The
// backend is stubbed at the network layer (Postern's /api/register/start and /confirm). The chain is refused, as in every licence spec, so the last step
// (Check again finds the licence) is given the way openUnlocked gives one: the held memory of the offline grace, written when the backend says it issued;
// that Check again finds a site issuer's mint on the chain is proven by features/get-licence.feature and tests/unit/licence-check.test.ts.
const START = '**/api/register/start';
const CONFIRM = '**/api/register/confirm';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
};

interface Said {
  start: unknown[];
  confirm: unknown[];
}

async function stubRegister(page: Page, answers: { start?: [number, object]; confirm?: [number, object] } = {}): Promise<Said> {
  const said: Said = { start: [], confirm: [] };
  const answer = (path: 'start' | 'confirm', fallback: [number, object]) => async (route: import('@playwright/test').Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    said[path].push(request.postDataJSON());
    const [status, body] = answers[path] ?? fallback;
    return route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  };
  await page.route(START, answer('start', [200, { registrationId: 'reg-1' }]));
  await page.route(CONFIRM, answer('confirm', [200, { personId: 'p1', devices: [{ key: SEED_PUBLIC_KEY, name: 'Pixel', addedAt: '2026-10-18T12:00:00Z' }], issued: true }]));
  return said;
}

async function openLicencePage(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Licence', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('status').getByText('Not licensed')).toBeVisible();
}

async function fillDetails(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Get a licence' }).click();
  await page.getByLabel('Email', { exact: true }).fill('reader@example.com');
  await page.getByLabel('Phone', { exact: true }).fill('+1 415 555 0101');
}

async function expectFitsPhone(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  for (const input of await page.locator('input').all()) {
    expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  for (const button of await page.locator('main button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

test('the Licence page says what a licence unlocks and offers Get a licence', async ({ page }) => {
  await openLicencePage(page);
  const unlocks = page.getByTestId('what-a-licence-unlocks');
  await expect(unlocks).toContainText('AI tutor');
  await expect(unlocks).toContainText('free');
  await expect(unlocks).toContainText('Twilio');
  await expect(unlocks).toContainText('scrambled fingerprints');
  await expect(page.getByText(/coming soon/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Get a licence' })).toBeVisible();
  await expect(page.getByTestId('device-key')).toHaveText(SEED_PUBLIC_KEY);
  await shot(page, 'licence-page-get');
});

test('email, phone, two codes: Licensed. Tap Check again., then Check again shows Licensed', async ({ page }) => {
  const said = await stubRegister(page);
  await openLicencePage(page);
  await fillDetails(page);
  await expectFitsPhone(page);
  await shot(page, 'get-licence-details');
  await page.getByRole('button', { name: 'Send codes' }).click();

  await expect(page.getByLabel('Email code')).toBeVisible();
  expect(said.start).toEqual([{ email: 'reader@example.com', phone: '+1 415 555 0101', deviceKey: SEED_PUBLIC_KEY }]);
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
  await page.getByLabel('Email code').fill('123456');
  await page.getByLabel('Phone code').fill('654321');
  await expectFitsPhone(page);
  await shot(page, 'get-licence-codes');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();

  await expect(page.getByText('Licensed. Tap Check again.')).toBeVisible();
  expect(said.confirm).toEqual([{ registrationId: 'reg-1', emailCode: '123456', phoneCode: '654321' }]);
  await shot(page, 'get-licence-done');

  // the chain would now hold the site issuer's mint; the offline grace's memory stands in for it here
  await page.evaluate((publicKeyHex) => window.localStorage.setItem('lampas.licenceHeld', JSON.stringify({ publicKeyHex, at: Date.now() })), SEED_PUBLIC_KEY);
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByRole('status').getByText('Licensed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get a licence' })).toHaveCount(0);
});

test('the 3-device refusal is shown verbatim', async ({ page }) => {
  await stubRegister(page, { confirm: [409, { error: 'This licence already has 5 devices. Remove one first.' }] });
  await openLicencePage(page);
  await fillDetails(page);
  await page.getByRole('button', { name: 'Send codes' }).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByLabel('Phone code').fill('654321');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('This licence already has 5 devices. Remove one first.');
  await expectFitsPhone(page);
  await shot(page, 'get-licence-5-devices');
});

test('the closed-registration refusal is shown verbatim', async ({ page }) => {
  await stubRegister(page, { start: [503, { error: 'registration closed' }] });
  await openLicencePage(page);
  await fillDetails(page);
  await page.getByRole('button', { name: 'Send codes' }).click();
  await expect(page.getByRole('alert')).toHaveText('registration closed');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('reader@example.com');
  await shot(page, 'get-licence-closed');
});

test('a wrong code says how many tries are left', async ({ page }) => {
  await stubRegister(page, { confirm: [400, { error: 'that code is not right', triesLeft: 4 }] });
  await openLicencePage(page);
  await fillDetails(page);
  await page.getByRole('button', { name: 'Send codes' }).click();
  await page.getByLabel('Email code').fill('111111');
  await page.getByLabel('Phone code').fill('222222');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('that code is not right (4 tries left)');
  await expect(page.getByLabel('Email code')).toHaveValue('111111');
});

test('Not now returns to the Licence page with the key', async ({ page }) => {
  await openLicencePage(page);
  await page.getByRole('button', { name: 'Get a licence' }).click();
  await expect(page.getByTestId('device-key')).toHaveCount(0);
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByTestId('device-key')).toHaveText(SEED_PUBLIC_KEY);
  await expect(page.getByRole('button', { name: 'Get a licence' })).toBeVisible();
});
