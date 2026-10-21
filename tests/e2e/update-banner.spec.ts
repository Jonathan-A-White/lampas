// tests/e2e/update-banner.spec.ts: in a real browser with its real service worker, a newer build waits
// behind the one in control, the banner says 'Update ready, tap to reload', and one tap on it makes the
// new worker take over and the page reload once. The "newer build" is the built sw.js served with one
// more comment line, so the browser sees changed bytes and installs it.
import { readFileSync } from 'node:fs';
import { test, expect, type Request } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The bounds below are the phone's screen, so the spec sets it (the chromium project is 1280 wide).
test.use({ viewport: { width: 390, height: 844 } });

test.use({ serviceWorkers: 'allow' });

// the waiting build's changelog (the server's, fetched fresh): with a line after the running version it is worth a banner
const running = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
const parts = running.split('.');
parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
const waitingVersion = parts.join('.');
const entry = (version: string) => ({ version, date: '2026-10-12', story: 'fx-1', kind: 'new', text: 'Something to see.' });
const withLine = [entry(waitingVersion), entry(running)];
const noLine = [entry(running)];

test('a newer build waits, the banner shows, one tap loads it and the page reloads once', async ({ page, context }) => {
  let build = 1;
  await page.route('**/changelog.json', (route) => route.fulfill({ json: withLine, headers: { 'cache-control': 'no-store' } }));
  await context.route('**/sw.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\n// build ${build}\n`, headers: { ...response.headers(), 'cache-control': 'no-store' } });
  });
  // The gate asks the chain on every return to the foreground and retries for a few seconds (refused here, so
  // it retries). Each ask goes through the worker in control, and Chromium wedges a SKIP_WAITING that lands
  // while the old worker has a request in flight: the new worker then never activates (the full-run failure).
  let lastChainAsk = Date.now();
  const chainAsked = (request: Request) => /whatsonchain\.com/.test(request.url()) && (lastChainAsk = Date.now());
  page.on('request', chainAsked);
  page.on('requestfailed', chainAsked);
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => frame.parentFrame() === null && navigations.push(frame.url()));

  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await expect(page.getByRole('button', { name: 'Update ready, tap to reload' })).toHaveCount(0);

  // A newer build is up: the app finds out when it returns to the foreground.
  build = 2;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const banner = page.getByRole('button', { name: 'Update ready, tap to reload' });
  await expect(banner).toBeVisible({ timeout: 20_000 });
  const box = await banner.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(box?.width).toBeLessThanOrEqual(390);
  await shot(page, 'update-banner');

  // A tap while the gate's lookups are still going can hang the worker's take-over, so wait for them to end
  // (their retries come about 0.7 s apart at most).
  await expect.poll(() => Date.now() - lastChainAsk, { timeout: 20_000 }).toBeGreaterThan(1500);
  const before = navigations.length;
  await banner.click();
  await expect.poll(() => navigations.length, { timeout: 20_000 }).toBeGreaterThan(before);
  await expect(page.getByRole('button', { name: 'Update ready, tap to reload' })).toHaveCount(0);
  // The page reloaded once, and the worker in control now is the new one.
  await page.waitForTimeout(1500);
  expect(navigations.length).toBe(before + 1);
  const scripts = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL);
  expect(scripts).toContain('/sw.js');
});

test('a newer build with nothing to show gets no banner, and takes over by itself only when the app is hidden', async ({ page, context }) => {
  let build = 1;
  await page.route('**/changelog.json', (route) => route.fulfill({ json: noLine, headers: { 'cache-control': 'no-store' } }));
  await context.route('**/sw.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\n// build ${build}\n`, headers: { ...response.headers(), 'cache-control': 'no-store' } });
  });
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => frame.parentFrame() === null && navigations.push(frame.url()));

  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // A newer build is up and waits; he is using the app, so nothing is offered and nothing is applied.
  build = 2;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting !== null), { timeout: 20_000 })
    .toBe(true);
  await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: 'Update ready, tap to reload' })).toHaveCount(0);
  const before = navigations.length;
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting !== null)).toBe(true);

  // The app goes to the background: the build takes over and the page reloads, out of his sight.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => navigations.length, { timeout: 20_000 }).toBeGreaterThan(before);
  await expect(page.getByRole('button', { name: 'Update ready, tap to reload' })).toHaveCount(0);
});
