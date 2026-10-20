// tests/e2e/your-requests.spec.ts — Your requests (mw-vy3ghg.5) at phone width, upright (390x844) and sideways (844x390): six requests, one in each
// state (Sent, Filed, Being built, Adopted in a version with its link, Declined with the reason, Now a setting), the statuses the fake Postern's mill
// sealed to the phone's key. Every line is readable inside the phone, the link is a thumb tall, nothing scrolls sideways; ends with a shot of each.
// Settings > Your requests opens the screen. jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked, SEED_PUBLIC_KEY } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';
import { pageTime, tapTwice } from '../support/gesture';

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
async function seed(page: Page, summaries: string[] = REQUESTS.map((r) => r.summary)): Promise<void> {
  const rows = summaries.map((summary, i) => ({ txid: txidOf(i), kind: 'tutor-ask', summary, app_version: '0.1.80', sentAt: Date.now() - (summaries.length - i) * 86_400_000, status: 'sent' }));
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

// A request of 400 characters is cut at three lines; a tap on it shows the rest and a second tap folds it; a short one is plain text; a 400-character
// string with no break in it never scrolls the screen sideways, folded or open.
for (const { name, width, height } of VIEWPORTS) {
  test(`a long request opens and folds on a tap at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const fake = makeFakePostern();
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/requests');
    await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
    const long = 'Let me hear the Greek at half speed and then at full speed, '.repeat(7).slice(0, 400).trim();
    const unbroken = 'W'.repeat(400);
    const short = 'Add a sepia theme';
    await seed(page, [unbroken, long, short]);
    await page.reload();

    const text = page.getByRole('button', { name: long });
    const heightOf = async (): Promise<number> => (await text.boundingBox())?.height ?? 0;
    const sideways = (): Promise<boolean> => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await expect(text).toHaveAttribute('aria-expanded', 'false');
    const folded = await heightOf();
    await text.click();
    await expect(text).toHaveAttribute('aria-expanded', 'true');
    expect(await heightOf()).toBeGreaterThan(folded + 20);
    expect(await text.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true); // all of it shows
    await shot(page, `your-requests-long-open-${name}`);
    await text.click();
    await expect(text).toHaveAttribute('aria-expanded', 'false');
    expect(await heightOf()).toBeCloseTo(folded, 0);

    await expect(page.getByRole('button', { name: short })).toHaveCount(0); // a short one is plain text
    await expect(page.getByText(short)).toBeVisible();

    const wide = page.getByRole('button', { name: unbroken });
    await expect(wide).toHaveAttribute('aria-expanded', 'false');
    expect(await sideways()).toBe(false);
    await wide.click();
    await expect(wide).toHaveAttribute('aria-expanded', 'true');
    expect(await sideways()).toBe(false);
    expect((await wide.boundingBox())?.width ?? 0).toBeLessThanOrEqual(width);
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
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/settings$/);
  await shot(page, 'your-requests-back-from-settings');
});

// A thumb's double tap on the Adopted link opens one GitHub tab, not two (mw-5r3p30.457): the second tap of a double tap falls inside the settle
// moment (src/ui/tapGuard.ts swallows taps after a link that leaves the app is tapped), put back here as on his phone (openUnlocked starts it at 0).
test('a double tap on the Adopted link opens one tab', async ({ page, context }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS)); // after openUnlocked's '0'
  await page.goto('/#/requests');
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await seed(page);
  fake.sendStatus(SEED_PUBLIC_KEY, status(3, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
  await page.reload();
  const link = page.getByRole('link', { name: 'Adopted in 0.1.86' });
  await expect(link).toHaveAttribute('href', COMMIT_URL);
  await link.scrollIntoViewIfNeeded();
  await pageTime(page, SETTLE_MS + 100);

  // GitHub is not reached from the test: its tab is answered with nothing
  await context.route('https://github.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  const opened: string[] = [];
  context.on('page', (tab) => opened.push(tab.url()));
  await tapTwice(page, link, 120);
  await expect.poll(() => opened.length).toBeGreaterThan(0);
  await pageTime(page, SETTLE_MS + 100);
  await page.waitForTimeout(500); // a second tab, if any, has opened by now
  expect(opened).toHaveLength(1);

  // two taps further apart than the moment are two taps, so the guard holds back no deliberate one
  await tapTwice(page, link, SETTLE_MS + 100);
  await expect.poll(() => opened.length).toBe(3);
});
