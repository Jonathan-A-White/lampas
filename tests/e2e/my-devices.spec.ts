// tests/e2e/my-devices.spec.ts — My devices on the Licence page (mw-cvwm1u.5); the stubbed Postern and the page are in tests/e2e/devices-page.ts.
import { expect, test, type Page } from '@playwright/test';
import { CORS, OTHER_KEY, SITE_ISSUER, openLicencePage, stubBackend } from './devices-page';
import { shot } from './shot';
import { SEED_PUBLIC_KEY } from './unlocked';

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
