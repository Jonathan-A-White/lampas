// tests/e2e/whats-new.spec.ts: at 390x844, in a real browser, the Update ready banner names the waiting version and what
// is in it (a newer sw.js waits behind the running one, and /changelog.json is the newer build's), What's new in the
// banner opens the sheet, the sheet shows once after an update, and About lists the versions, checks for updates and
// links the version to CHANGELOG.md on GitHub. Shots: whats-new-banner, whats-new-banner-sheet, whats-new-sheet, whats-new-about.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const running = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
const parts = running.split('.');
parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
const waiting = parts.join('.');

const changelog = [
  { version: waiting, date: '2026-10-12', story: 'fx-3', kind: 'new', text: 'Pin a verse to the top of the chapter.' },
  { version: waiting, date: '2026-10-12', story: 'fx-4', kind: 'new', text: 'Hear the whole chapter read to you, one verse after another.' },
  { version: waiting, date: '2026-10-12', story: 'fx-5', kind: 'fixed', text: 'The chapter list no longer jumps when you open it.' },
  { version: running, date: '2026-10-09', story: 'fx-2', kind: 'new', text: "What's new in the app" },
  { version: '0.0.5', date: '2026-09-20', story: 'fx-6', kind: 'fixed', text: 'A verse read aloud no longer stops at its first word.' },
  { version: '0.0.1', date: '2026-09-01', story: 'fx-1', kind: 'new', text: 'Reading Romans 8 in Greek and English.' },
];

async function serveChangelog(page: Page): Promise<void> {
  await page.route('**/changelog.json', (route) => route.fulfill({ json: changelog, headers: { 'cache-control': 'no-store' } }));
}

test.describe('with a service worker', () => {
  test.use({ serviceWorkers: 'allow', viewport: VIEWPORT });

  test('the banner names the waiting version and what is in it, and What\'s new opens the lines', async ({ page, context }) => {
    let build = 1;
    await context.route('**/sw.js', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}\n// build ${build}\n`, headers: { ...response.headers(), 'cache-control': 'no-store' } });
    });
    await serveChangelog(page);
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByTestId('build-version')).toBeAttached();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    build = 2;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const banner = page.getByRole('button', { name: 'Update ready, tap to reload' });
    await expect(banner).toBeVisible({ timeout: 20_000 });
    const summary = page.locator('.bk-whats-new__summary');
    await expect(summary).toContainText(`${waiting} · 2 new, 1 fixed`);
    const open = summary.getByRole('button', { name: "What's new" });
    const box = await open.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    // the banner fits the phone: no sideways scroll, the summary inside the screen
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(sideways).toBe(false);
    const summaryBox = await summary.boundingBox();
    expect((summaryBox?.x ?? 0) + (summaryBox?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    await shot(page, 'whats-new-banner');

    await open.click();
    const sheet = page.getByRole('dialog', { name: "What's new" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Pin a verse to the top of the chapter.');
    await expect(sheet).toContainText('The chapter list no longer jumps when you open it.');
    await expect(sheet).not.toContainText('Reading Romans 8');
    const sheetBox = await sheet.boundingBox();
    expect((sheetBox?.x ?? 0) + (sheetBox?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    expect(sheetBox?.height ?? 0).toBeLessThanOrEqual(VIEWPORT.height);
    await shot(page, 'whats-new-banner-sheet');
    // the phone's Back closes it
    await page.goBack();
    await expect(sheet).toBeHidden();
  });
});

test.describe('without a service worker', () => {
  test.use({ viewport: VIEWPORT });

  test('after an update the sheet shows once', async ({ page }) => {
    await serveChangelog(page);
    await openUnlocked(page);
    // only the first load: the init script runs again on the reload, which must find the version he has seen
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('lampas.lastSeenVersion')) window.localStorage.setItem('lampas.lastSeenVersion', '0.0.1');
    });
    await page.goto('/');
    const sheet = page.getByRole('dialog', { name: "What's new" });
    await expect(sheet).toBeVisible();
    // every version since the last one he saw, up to the one that is running: not the one still waiting, not the one he saw
    await expect(sheet).toContainText(running);
    await expect(sheet).toContainText("What's new in the app");
    await expect(sheet).toContainText('A verse read aloud no longer stops at its first word.');
    await expect(sheet).not.toContainText(waiting);
    await expect(sheet).not.toContainText('Reading Romans 8');
    await shot(page, 'whats-new-sheet');
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await expect(page.getByRole('dialog', { name: "What's new" })).toHaveCount(0);
  });

  test('About lists the versions, checks for updates and links the version to CHANGELOG.md', async ({ page }) => {
    await serveChangelog(page);
    await openUnlocked(page);
    await page.goto('/#/about');
    const section = page.getByRole('region', { name: "What's new" });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText(waiting);
    await expect(section).toContainText('Reading Romans 8 in Greek and English.');
    const check = section.getByRole('button', { name: 'Check for updates' });
    expect((await check.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await check.click();
    await expect(section.getByText('Up to date')).toBeVisible();

    const link = page.getByTestId('version-link');
    await link.scrollIntoViewIfNeeded();
    await expect(link).toHaveAttribute('href', `https://github.com/Jonathan-A-White/lampas/blob/main/CHANGELOG.md#${running.replace(/\./g, '')}`);
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await expect(page.getByTestId('build-version')).toContainText(`v${running}`);

    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(sideways).toBe(false);
    await section.scrollIntoViewIfNeeded();
    await shot(page, 'whats-new-about');
  });
});
