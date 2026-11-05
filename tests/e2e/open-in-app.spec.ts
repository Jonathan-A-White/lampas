// tests/e2e/open-in-app.spec.ts — 'Open in the app' (mw-5r3p30.1041): in a Chrome tab on Android where navigator.getInstalledRelatedApps (stubbed here: a real install
// cannot be made in a test) reports the app, one labelled control shows at 360x740 and 390x844, at 100 % and at larger text. It is clear of the floating ? and floats over the top edge (mw-5r3p30.1051: arriving late it moves neither the Reader's
// verse nor its box, at 390x844 and 844x390), no wider than the phone, and 'Not now' puts it away for the session. Nothing leaves the page by itself: the address is as it was opened. The tap's intent: URL is
// proven in tests/unit/open-in-app.test.tsx (a desktop Chromium cannot follow an intent: address); the last test reads the address the tap requests (CDP Page.frameRequestedNavigation) and opens it
// in a fresh context, to prove the verse survives the hand-over (mw-5r3p30.1050). Ends with a shot.
import { expect, test, type Page } from '@playwright/test';
import { openWithTextSize, PHONES } from './next-in-view';
import { FLOATING } from './open-tutor';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
test.use({ hasTouch: true, userAgent: ANDROID });

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function stubApi(page: Page, apps: unknown[]): Promise<void> {
  await page.addInitScript((list) => {
    Object.defineProperty(navigator, 'getInstalledRelatedApps', { value: () => Promise.resolve(list), configurable: true });
  }, apps);
}

/** The API answering late, as the real one does: after `ms`. */
async function stubSlowApi(page: Page, apps: unknown[], ms: number): Promise<void> {
  await page.addInitScript(
    ([list, wait]) => {
      Object.defineProperty(navigator, 'getInstalledRelatedApps', { value: () => new Promise((resolve) => setTimeout(() => resolve(list), wait as number)), configurable: true });
    },
    [apps, ms] as const,
  );
}

const WEBAPP = [{ platform: 'webapp', url: 'https://lampas.allmymind.org/manifest.webmanifest' }];

for (const phone of PHONES.filter((p) => p.size.width < 400)) {
  for (const percent of [100, 130, 160]) {
    test(`${phone.name} at ${percent} % text: the control is clear of the ? and the reading text, fits, and Not now puts it away`, async ({ page }) => {
      const navigations: string[] = [];
      page.on('framenavigated', (frame) => frame.parentFrame() === null && navigations.push(frame.url()));
      await page.setViewportSize(phone.size);
      await stubApi(page, WEBAPP);
      await openUnlocked(page);
      await openWithTextSize(page, '#/', percent);
      const origin = new URL(page.url()).origin;
      const strip = page.locator('[data-open-in-app]');
      const open = strip.getByRole('button', { name: 'Open in the app' });
      await expect(open).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      const view = page.viewportSize()!;
      const stripBox = (await strip.boundingBox())!;
      expect(stripBox.x, 'strip left').toBeGreaterThanOrEqual(0);
      expect(stripBox.x + stripBox.width, 'strip right').toBeLessThanOrEqual(view.width);
      for (const control of [open, strip.getByRole('button', { name: 'Not now' })]) {
        const box = (await control.boundingBox())!;
        expect(box.height, 'a thumb-sized target').toBeGreaterThanOrEqual(43.5);
        expect(box.x + box.width).toBeLessThanOrEqual(view.width);
        expect(await control.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'its label is not clipped').toBe(true);
        const door = page.locator(FLOATING);
        if (await door.isVisible()) expect(meets(box, (await door.boundingBox())!), 'the ? is over it').toBe(false);
      }
      // the strip floats over the top of the screen and takes no room from the reading box (mw-5r3p30.1051): it sits at the top edge, under the phone's own inset
      expect(stripBox.y, 'the strip is at the top of the screen').toBeLessThan(view.height / 4);
      // nothing left the page by itself: no top-level navigation to another document or an intent: address, still the app's own origin
      await page.waitForTimeout(500); // a short hold so an automatic hand-over would have happened
      expect(navigations.filter((url) => !url.startsWith(origin)), 'left the app').toEqual([]);
      await shot(page, `open-in-app-${phone.name}-${percent}`);

      await strip.getByRole('button', { name: 'Not now' }).click();
      await expect(strip).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      await expect(strip).toHaveCount(0);
    });
  }
}

// mw-5r3p30.1051: the strip arrives when the API answers, seconds after he has started reading: it floats over the top and moves nothing.
for (const size of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`${size.width}x${size.height}: the strip arriving after 3 s moves neither verse 28 nor the reading box`, async ({ page }) => {
    await page.setViewportSize(size);
    await stubSlowApi(page, WEBAPP, 3000);
    await openUnlocked(page);
    await page.goto('/#/?ref=Rom.8.28');
    const strip = page.locator('[data-open-in-app]');
    const verse = page.locator('[data-reader] [data-verse="28"]').first();
    const reader = page.locator('[data-reader]');
    await expect(verse).toBeVisible();
    await expect(reader).toHaveAttribute('data-brought-verse', '28');
    await page.waitForTimeout(1000); // the verse has settled at the top, and the API has not answered yet
    await expect(strip, 'the strip is not here yet').toHaveCount(0);
    const before = { verse: (await verse.boundingBox())!, reader: (await reader.boundingBox())!, scroll: await reader.evaluate((el) => el.scrollTop) };
    await expect(strip).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500); // anything the strip would push has moved by now
    const after = { verse: (await verse.boundingBox())!, reader: (await reader.boundingBox())!, scroll: await reader.evaluate((el) => el.scrollTop) };
    expect(Math.abs(after.verse.y - before.verse.y), `verse 28 top ${before.verse.y} -> ${after.verse.y}`).toBeLessThanOrEqual(1);
    expect(Math.abs(after.reader.height - before.reader.height), `reading box height ${before.reader.height} -> ${after.reader.height}`).toBeLessThanOrEqual(1);
    expect(Math.abs(after.reader.y - before.reader.y), `reading box top ${before.reader.y} -> ${after.reader.y}`).toBeLessThanOrEqual(1);
    expect(after.scroll, 'the reading box was not scrolled by it').toBeCloseTo(before.scroll, 0);
    await expect(strip.getByRole('button', { name: 'Open in the app' })).toBeVisible();
    await shot(page, `open-in-app-late-${size.width}x${size.height}`);
  });
}

test('shows nothing where the API reports nothing, or is absent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, []);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-open-in-app]')).toHaveCount(0);
  await shot(page, 'open-in-app-none');
});

test('never shows inside the installed app (display-mode standalone)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, WEBAPP);
  await page.emulateMedia({ media: null });
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => (/display-mode:\s*standalone/.test(query) ? Object.assign(real('all'), { matches: true, media: query }) : real(query));
  });
  await openUnlocked(page);
  await page.goto('/#/?ref=Rom.8.28');
  await expect(page.locator('[data-shell]')).toBeVisible();
  await expect(page.locator('[data-open-in-app]')).toHaveCount(0);
  expect(page.url()).toMatch(/^http:\/\/localhost/);
});

/** The http address inside an intent: URL (`intent://host/path#hash#Intent;scheme=http;...;end`): what Android hands to the app. */
function addressOfIntent(intent: string): string {
  const body = intent.slice('intent://'.length);
  const at = body.lastIndexOf('#Intent;');
  const scheme = /;scheme=(https?);/.exec(body.slice(at))?.[1] ?? 'https';
  return `${scheme}://${body.slice(0, at)}`;
}

/** Taps 'Open in the app' on the page and returns the address inside the intent: URL the tap requested (read off Chromium's own navigation request, which is not followed). */
async function tapAndRead(page: Page): Promise<string> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const requested: string[] = [];
  cdp.on('Page.frameRequestedNavigation', (event: { url: string }) => requested.push(event.url));
  await page.locator('[data-open-in-app]').getByRole('button', { name: 'Open in the app' }).click();
  await expect.poll(() => requested.find((url) => url.startsWith('intent://')), 'the tap requests an intent: URL').toBeTruthy();
  return addressOfIntent(requested.find((url) => url.startsWith('intent://'))!);
}

for (const opened of ['/#/?ref=Rom.8.28', '/#/?ref=Rom.8.28&view=greek', '/#/?b=rom&c=8&v=28']) {
  test(`${opened}: the address the tap hands over opens verse 28 in a fresh install, on screen`, async ({ page, browser }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubApi(page, WEBAPP);
    await openUnlocked(page);
    await page.goto(opened);
    await expect(page.locator('[data-open-in-app]')).toBeVisible();
    await expect(page.locator('[data-verse="28"]').first()).toBeVisible();
    if (!opened.includes('v=28')) await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '28');
    await page.waitForTimeout(1500); // the verse has settled at the top
    const handed = await tapAndRead(page);

    // the installed app: another context, no saved reading place, no scroll memory
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: ANDROID, hasTouch: true, baseURL: new URL(page.url()).origin });
    try {
      const app = await fresh.newPage();
      await openUnlocked(app);
      await app.goto(handed);
      const reader = app.locator('[data-reader]');
      await expect(reader).toHaveAttribute('data-brought-verse', '28');
      await app.waitForTimeout(1500);
      const verse = app.locator('[data-reader] [data-verse="28"]').first();
      await expect(verse).toBeAttached();
      const box = (await reader.boundingBox())!;
      const at = (await verse.boundingBox())!;
      expect(at.y, 'verse 28 is not scrolled away above the Reader box').toBeGreaterThanOrEqual(box.y - 1);
      expect(at.y, 'verse 28 is not scrolled away below the Reader box').toBeLessThan(box.y + box.height);
      expect(app.url()).toContain('c=8');
      await shot(app, 'open-in-app-fresh-verse-28');
    } finally {
      await fresh.close();
    }
  });
}
