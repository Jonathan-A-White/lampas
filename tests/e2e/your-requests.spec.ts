// tests/e2e/your-requests.spec.ts — Your requests (mw-vy3ghg.5) at phone width, upright (390x844) and sideways (844x390): six requests, one in each
// state (Sent, Filed, Being built, Adopted in a version with its link, Declined with the reason, Now a setting), the statuses the fake Postern's mill
// sealed to the phone's key. Every line is readable inside the phone, the link is a thumb tall, nothing scrolls sideways; ends with a shot of each.
// Settings > Your requests opens the screen. jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked, SEED_PUBLIC_KEY } from './unlocked';

const VIEWPORTS = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'landscape', width: 844, height: 390 },
];
const COMMIT_URL = 'https://github.com/Jonathan-A-White/lampas/commit/0123456789abcdef0123456789abcdef01234567';

const REQUESTS = [
  { summary: 'Let me hear the Greek at half speed in one tap', line: 'Sent' },
  { summary: 'A sepia reading theme for the evening', line: 'Filed' },
  { summary: 'Read the chapter to me while I walk', line: 'Being built' },
  { summary: 'Show the verse number big beside the verse', line: 'Adopted in 0.1.86' },
  { summary: 'Add the Old Testament in Hebrew with a tutor', line: 'Declined: outside what this app is for' },
  { summary: 'Make the Greek text larger than Largest', line: 'Now a setting: Settings > Appearance > Text size' },
];

const txidOf = (index: number): string => `direct:${String(index + 1).repeat(64)}`;

// Puts the requests in the app's own store through raw IndexedDB, as the app wrote them.
async function seed(page: Page): Promise<void> {
  const rows = REQUESTS.map((r, i) => ({ txid: txidOf(i), kind: 'tutor-ask', summary: r.summary, app_version: '0.1.80', sentAt: Date.now() - (REQUESTS.length - i) * 86_400_000, status: 'sent' }));
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('requests', 'readwrite');
          for (const row of list) tx.objectStore('requests').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

const status = (index: number, plain: Record<string, unknown>) =>
  ({ kind: 'request-status', request: txidOf(index), bead: `mw-x.${index}`, ts: 1_790_000_000_000 + index * 1000, ...plain }) as Record<string, unknown>;

for (const { name, width, height } of VIEWPORTS) {
  test(`every status of a request reads in full at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const fake = makeFakePostern();
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/requests');
    await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
    await seed(page);
    fake.sendStatus(SEED_PUBLIC_KEY, status(1, { status: 'filed' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(2, { status: 'building' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(3, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(4, { status: 'declined', reason: 'outside what this app is for' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(5, { status: 'adopted-as-setting', setting: 'Settings > Appearance > Text size' }));
    await page.reload();

    for (const { summary, line } of REQUESTS) {
      const row = page.locator('[data-request]', { hasText: summary });
      await expect(row.locator('[data-request-status]')).toHaveText(line);
      await row.scrollIntoViewIfNeeded();
      const box = await row.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    }
    const link = page.getByRole('link', { name: 'Adopted in 0.1.86' });
    await expect(link).toHaveAttribute('href', COMMIT_URL);
    await link.scrollIntoViewIfNeeded();
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await expect(page.locator('[data-request]').first()).toContainText('Make the Greek text larger'); // the newest first
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await page.locator('.screen').first().evaluate((el) => (el.scrollTop = 0));
    await shot(page, `your-requests-${name}`);
  });
}

test('Settings has a Your requests row that opens the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('button', { name: /^Your requests/ });
  await row.scrollIntoViewIfNeeded();
  expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await row.click();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await expect(page.locator('[data-requests-empty]')).toBeVisible();
});

test('from About the back button reads ‹ About and returns there; a double tap on it stops on the screen before', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/about');
  await page.getByRole('button', { name: /^Your requests/ }).click();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: '‹ About' })).toBeVisible();
  await page.getByRole('button', { name: '‹ About' }).click();
  await expect(page).toHaveURL(/#\/about$/);

  // Settings: a double tap on the row adds one history entry, a double tap on the back button stops on Settings (its own ‹ Reader sits at the same spot)
  await page.goto('/#/settings');
  const before = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: /^Your requests/ }).dblclick();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
  await page.getByRole('button', { name: '‹ Settings' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/settings$/);
  await shot(page, 'your-requests-back-from-settings');
});
