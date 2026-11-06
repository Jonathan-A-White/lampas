// tests/e2e/open-in-app.spec.ts — 'Open in the app' (mw-5r3p30.1041): in a Chrome tab on Android where navigator.getInstalledRelatedApps (stubbed here: a real install
// cannot be made in a test) reports the app, one labelled control shows at 360x740 and 390x844, at 100 % and at larger text. It is clear of the floating ? and floats over the top edge (mw-5r3p30.1051: arriving late it moves neither the Reader's
// verse nor its box, at 390x844 and 844x390), no wider than the phone, and 'Not now' puts it away for the session. Nothing leaves the page by itself: the address is as it was opened. The tap
// opens the plain address in a new tab with no opener and no referrer (mw-5r3p30.1082; the form, and why not an intent: URL, are in src/openInApp.ts goTo); the last test reads that tab's address
// and Referer and opens the address in a fresh context, to prove the verse survives the hand-over (mw-5r3p30.1050). Whether Android's installed app takes it is not provable in a test. Ends with a shot.
import { expect, test, type Page } from '@playwright/test';
import { openWithTextSize, PHONES } from './next-in-view';
import { FLOATING } from './open-tutor';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';

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
      const tabs: string[] = [];
      page.context().on('page', (tab) => tabs.push(tab.url()));
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
      // nothing left the page by itself: no top-level navigation to another document or an intent: address, still the app's own origin, and no new tab
      await page.waitForTimeout(500); // a short hold so an automatic hand-over would have happened
      expect(navigations.filter((url) => !url.startsWith(origin)), 'left the app').toEqual([]);
      expect(tabs, 'no tab opened by itself').toEqual([]);
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

/**
 * Taps 'Open in the app' on the page and returns what the tap asked for: the address of the new tab it opens, and the Referer that tab's request carried (mw-5r3p30.1082: Chromium keeps
 * an intent: URL for the app's own host in Chrome, so the tap opens the plain address in a new tab with no opener and no referrer, which Chromium's same-host rule does not hold in
 * Chrome). A desktop Chromium has no installed app to take it, so the new tab is read, not followed to an app; the page that was tapped has not moved.
 */
async function tapAndRead(page: Page): Promise<{ address: string; referer: string | undefined; opener: boolean }> {
  const before = page.url();
  const requests: { url: string; referer: string | undefined }[] = [];
  page.context().on('request', (request) => request.isNavigationRequest() && requests.push({ url: request.url(), referer: request.headers()['referer'] }));
  const popup = page.context().waitForEvent('page');
  await page.locator('[data-open-in-app]').getByRole('button', { name: 'Open in the app' }).click();
  const opened = await popup;
  await opened.waitForLoadState('domcontentloaded');
  const address = opened.url();
  const opener = await opened.evaluate(() => window.opener !== null);
  expect(page.url(), 'the tapped page stayed where it was').toBe(before);
  const asked = requests.find((r) => r.url.split('#')[0] === address.split('#')[0]);
  await opened.close();
  return { address, referer: asked?.referer, opener };
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
    const { address: handed, referer, opener } = await tapAndRead(page);
    expect(handed.startsWith('intent:'), 'a plain address, not an intent: URL').toBe(false);
    expect(referer, 'no Referer: the page the tap came from is not named').toBeUndefined();
    expect(opener, 'no window.opener').toBe(false);

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

// mw-5r3p30.1066: the tap while Romans 8 is still loading. The verse the link named is in neither the address (the plain chapter replaced it) nor the box (no text yet), but the request
// that is bringing it still is; the hand-over keeps it, and a fresh install opens at verse 28.
test('tapped while Romans 8 is still loading, the hand-over still names verse 28, and a fresh install opens there', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, WEBAPP);
  await openUnlocked(page);
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/data\/rom\/8\.json/, async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.goto('/#/?ref=Rom.8.28');
    await expect(page.getByText('Loading Romans 8')).toBeVisible();
    const strip = page.locator('[data-open-in-app]');
    await expect(strip).toBeVisible();
    await expect(page).toHaveURL(/#\/\?b=rom&c=8/); // LinkOpener has made the address the plain chapter
    const { address: handed } = await tapAndRead(page);
    expect(new URL(handed).hash, 'the verse the link named is handed over').toContain('ref=Rom.8.28');
    await shot(page, 'open-in-app-tap-while-loading');

    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: ANDROID, hasTouch: true, baseURL: new URL(page.url()).origin });
    try {
      const app = await fresh.newPage();
      await openUnlocked(app);
      await app.goto(handed);
      await expect(app.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '28');
      await app.waitForTimeout(1500);
      const box = (await app.locator('[data-reader]').boundingBox())!;
      const at = (await app.locator('[data-reader] [data-verse="28"]').first().boundingBox())!;
      expect(at.y, 'verse 28 is not scrolled away above the Reader box').toBeGreaterThanOrEqual(box.y - 1);
      expect(at.y, 'verse 28 is not scrolled away below the Reader box').toBeLessThan(box.y + box.height);
    } finally {
      await fresh.close();
    }
  } finally {
    release();
  }
});

// mw-5r3p30.1093 (mw-5r3p30.1053, .1089): a double tap hands over once. openUnlocked starts the settle moment at 0, so this spec puts it back (init scripts run in order).
test('390x844: a fast double tap on Open in the app opens one new tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, WEBAPP);
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  // Chromium lets one popup through per user activation and a headless tab may drop the second anyway, so the new tabs alone can hide a second hand-over: count the links the page clicks too
  await page.addInitScript(() => {
    const real = HTMLAnchorElement.prototype.click;
    Object.assign(window, { handOvers: 0 });
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.target === '_blank') (window as unknown as { handOvers: number }).handOvers += 1;
      real.call(this);
    };
  });
  await page.goto('/#/?ref=John.5.25');
  const button = page.locator('[data-open-in-app]').getByRole('button', { name: 'Open in the app' });
  await expect(button).toBeVisible();
  const tabs: string[] = [];
  page.context().on('page', (tab) => tabs.push(tab.url()));
  const at = (await button.boundingBox())!;
  await page.touchscreen.tap(at.x + at.width / 2, at.y + at.height / 2);
  await page.touchscreen.tap(at.x + at.width / 2, at.y + at.height / 2);
  await page.waitForTimeout(1000);
  expect(tabs, 'one new tab for two taps').toHaveLength(1);
  expect(await page.evaluate(() => (window as unknown as { handOvers: number }).handOvers), 'one hand-over for two taps').toBe(1);
  // he can tap again once the moment has passed: the tap that opened nothing is not locked out for good
  await button.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { handOvers: number }).handOvers), 'a later tap hands over again').toBe(2);
  await shot(page, 'open-in-app-double-tap');
});

// mw-5r3p30.1093 (mw-5r3p30.1080, .1081): the strip floats, but it covers neither another bar of the shell nor a screen's own top bar and way back.
const SIZES = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

/** Every bar the shell can hold, as the real ones draw it (src/UpdateBanner.tsx, src/speech/TutorWaitingBar.tsx, src/WelcomeBack.tsx), put into [data-shell-bars] next to the strip. */
async function putBarsIn(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bars = document.querySelector('[data-shell-bars]')!;
    const bar = (attr: string, label: string, cls: string) => {
      const div = document.createElement('div');
      div.setAttribute(attr, '');
      div.className = cls;
      div.innerHTML = `<button type="button" class="flex w-full items-center justify-center px-3 py-3 text-base font-medium">${label}</button>`;
      bars.appendChild(div);
    };
    bar('data-update-banner', 'Update ready, tap to reload', 'border-b border-line bg-accent text-accent-fg');
    bar('data-tutor-waiting', 'The tutor answered: tap to play', 'border-b border-line bg-accent text-accent-fg');
    bar('data-welcome-back', 'Welcome back', 'border-b border-line bg-surface');
  });
}

/** The visible buttons and headings that match `selector` and whose own centre has the strip over it. */
async function underStrip(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const strip = document.querySelector('[data-open-in-app]');
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => !strip?.contains(el) && el.getClientRects().length > 0)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.bottom <= 0 || r.top >= window.innerHeight) return false;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && !!strip && strip.contains(top);
      })
      .map((el) => `${el.tagName} ${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)}`);
  }, selector);
}

for (const size of SIZES) {
  test(`${size.width}x${size.height}: the Update ready bar, the tutor's bar and Welcome back are not covered by the strip`, async ({ page }) => {
    await page.setViewportSize(size);
    await stubApi(page, WEBAPP);
    await openUnlocked(page);
    await page.goto('/#/?ref=Rom.8.28');
    await expect(page.locator('[data-open-in-app]')).toBeVisible();
    await putBarsIn(page);
    await page.waitForTimeout(300); // the bars' foot is measured again
    for (const attr of ['data-update-banner', 'data-tutor-waiting', 'data-welcome-back']) {
      const button = page.locator(`[${attr}] button`);
      const hit = await button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { itself: top === el || el.contains(top), inStrip: !!top?.closest('[data-open-in-app]') };
      });
      expect(hit, `${attr}: its button is the element at its own centre`).toEqual({ itself: true, inStrip: false });
    }
    expect(await underStrip(page, '[data-shell-bars] button'), 'no bar button is under another').toEqual([]);
    // the strip's own buttons are reachable too
    expect(await page.locator('[data-open-in-app] button').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return top === el || el.contains(top);
    })), 'the strip\'s buttons are on top').toEqual([true, true]);
    await shot(page, `open-in-app-bars-${size.width}x${size.height}`);
  });
}

for (const size of SIZES) {
  for (const hash of ['#/?ref=Rom.8.28', '#/settings', '#/words', '#/about']) {
    test(`${size.width}x${size.height} ${hash}: the strip does not cover the screen's top bar or its way back`, async ({ page }) => {
      await page.setViewportSize(size);
      await stubApi(page, WEBAPP);
      await openUnlocked(page);
      await page.goto(`/${hash}`);
      await expect(page.locator('[data-open-in-app]')).toBeVisible();
      await page.waitForTimeout(500);
      const header = page.locator('[data-shell] header').first();
      await expect(header).toBeVisible();
      const strip = (await page.locator('[data-open-in-app]').boundingBox())!;
      const bar = (await header.boundingBox())!;
      expect(strip.y, 'the strip starts at or under the foot of the top bar').toBeGreaterThanOrEqual(bar.y + bar.height - 1);
      expect(await underStrip(page, '[data-shell] header button, [data-shell] header h1, [data-shell] header a'), 'no control or title of the top bar is under the strip').toEqual([]);
      if (hash === '#/settings') {
        const back = page.getByRole('button', { name: '‹ Reader' });
        await expect(back).toBeVisible();
        expect(await back.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return top === el || el.contains(top);
        }), '‹ Reader is the element at its own centre').toBe(true);
      }
      if (hash.startsWith('#/?')) {
        const gear = page.getByRole('button', { name: 'Settings', exact: true });
        await expect(gear).toBeVisible();
        expect(await gear.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return top === el || el.contains(top);
        }), 'the Reader\'s gear is the element at its own centre').toBe(true);
      }
      await shot(page, `open-in-app-topbar-${hash.replace(/[^a-z]/gi, '')}-${size.width}x${size.height}`);
    });
  }
}
