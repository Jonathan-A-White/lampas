import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { openUnlocked } from './unlocked';

// The Immersive reader asks the browser for full screen (mw-5r3p30.296): on his first tap or scroll in the text, so the phone's status and
// navigation bars go away, and keeps it (mw-5r3p30.316: Chrome shows "To exit full screen" at every entry, so a two-finger tap that only brings
// Lampas's own bars back must not leave it). It leaves full screen when he leaves the Reader and when Immersive reader goes Off. Where the API is absent or refuses, nothing breaks. Chromium headless cannot really go full screen, so the API is stood in for by
// hand (window.__fs counts the calls and keeps document.fullscreenElement as the real one does). Runs under --project=shots (390x844).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

interface Fs {
  requests: number;
  exits: number;
  /** the phone ends full screen on its own: the element goes and `fullscreenchange` fires, with no call of the page's */
  leaveByItself(): void;
}
declare global {
  interface Window {
    __fs: Fs;
  }
}

type Mode = 'works' | 'rejects' | 'absent';

/** The phone leaves full screen by its own doing (Android Back, the swipe Chrome's notice offers): no exitFullscreen call of the page's, only the change. */
const leaveByItself = (page: Page) =>
  page.evaluate(() => {
    window.__fs.leaveByItself();
  });

/** Stands in for the Fullscreen API before the page's own scripts run. */
async function fakeFullscreen(page: Page, mode: Mode) {
  await page.addInitScript((m: Mode) => {
    let element: Element | null = null;
    const fs = {
      requests: 0,
      exits: 0,
      leaveByItself() {
        element = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      },
    };
    window.__fs = fs;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
    if (m === 'absent') {
      // a phone with no Fullscreen API: neither method exists
      Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, value: undefined });
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: undefined });
      return;
    }
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value() {
        fs.requests += 1;
        if (m === 'rejects') return Promise.reject(new TypeError('Permissions check failed'));
        element = document.documentElement;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      },
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value() {
        fs.exits += 1;
        element = null;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      },
    });
  }, mode);
}

/** Puts the Immersive reader setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keepImmersive(page: Page, value: 'on' | 'off') {
  await page.evaluate(
    (v) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'immersiveReader', value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    value,
  );
}

async function openReader(page: Page, immersive: 'on' | 'off', mode: Mode = 'works') {
  await fakeFullscreen(page, mode);
  await openUnlocked(page);
  await honestMic(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keepImmersive(page, immersive);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const counts = (page: Page) => page.evaluate(() => ({ requests: window.__fs.requests, exits: window.__fs.exits }));
const fullScreen = (page: Page) => page.evaluate(() => document.fullscreenElement !== null);
const scrollText = (page: Page, by: number) =>
  page.evaluate((px) => {
    const box = document.querySelector('[data-reader]') as HTMLElement;
    box.scrollTop += px;
  }, by);

/** A finger that touches the text and lifts again: a tap on the strip of the reading box left of the words, which opens nothing. */
async function tapText(page: Page) {
  const box = await page.locator('[data-reader]').boundingBox();
  if (!box) throw new Error('no reading box');
  await page.touchscreen.tap(2, box.y + box.height / 2);
}

async function twoFingerTap(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: 150, y: 450, id: 1 },
    { x: 240, y: 460, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('with Immersive reader On, the first tap in the text asks for full screen, once', async ({ page }) => {
  await openReader(page, 'on');
  await page.waitForTimeout(500);
  expect(await counts(page)).toEqual({ requests: 0, exits: 0 });

  await tapText(page);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  expect(await fullScreen(page)).toBe(true);

  // more taps and scrolling, already full screen: no second request
  await tapText(page);
  await scrollText(page, 400);
  await page.waitForTimeout(500);
  expect((await counts(page)).requests).toBe(1);
});

test('with Immersive reader On, the first scroll in the text asks for full screen', async ({ page }) => {
  await openReader(page, 'on');
  expect((await counts(page)).requests).toBe(0);
  await scrollText(page, 400);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  expect(await fullScreen(page)).toBe(true);
});

test('two-finger taps bring the bars back and put them away, and full screen is asked for once and kept', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 400);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  await expect(page.locator('header').first()).toBeHidden();

  await twoFingerTap(page);
  await expect(page.locator('header').first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await counts(page)).toEqual({ requests: 1, exits: 0 });
  expect(await fullScreen(page)).toBe(true);

  await twoFingerTap(page);
  await expect(page.locator('header').first()).toBeHidden();
  await scrollText(page, 300);
  await page.waitForTimeout(500);
  expect(await counts(page)).toEqual({ requests: 1, exits: 0 });
  expect(await fullScreen(page)).toBe(true);
});

test('leaving the Reader leaves full screen, and with Immersive reader Off nothing asks for it', async ({ page }) => {
  await openReader(page, 'on');
  await tapText(page);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });

  // the bars are still shown: the gear is in the header
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 1 });
  expect(await fullScreen(page)).toBe(false);

  // switched Off, the Reader never asks again
  await keepImmersive(page, 'off');
  await page.reload();
  await page.goBack();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'off');
  await tapText(page);
  await scrollText(page, 400);
  await page.waitForTimeout(600);
  expect((await counts(page)).requests).toBe(0);
});

test('with Immersive reader Off the Reader never asks for full screen', async ({ page }) => {
  await openReader(page, 'off');
  await tapText(page);
  await scrollText(page, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);
  expect(await counts(page)).toEqual({ requests: 0, exits: 0 });
  await expect(page.locator('header').first()).toBeVisible();
});

test('where full screen is refused, the Reader still works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openReader(page, 'on', 'rejects');
  await tapText(page);
  await scrollText(page, 400);
  await expect.poll(async () => (await counts(page)).requests).toBeGreaterThan(0);
  // the bars still slide away, a two-finger tap still brings them back
  await expect(page.locator('header').first()).toBeHidden();
  await twoFingerTap(page);
  await expect(page.locator('header').first()).toBeVisible();
  await page.locator('[data-verse="3"] [role="button"][data-chunk]').first().scrollIntoViewIfNeeded();
  expect(errors).toEqual([]);
});

test('where the phone has no full-screen API, the Reader still works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openReader(page, 'on', 'absent');
  await tapText(page);
  await scrollText(page, 400);
  await expect(page.locator('header').first()).toBeHidden();
  await twoFingerTap(page);
  await expect(page.locator('header').first()).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

// The phone ends full screen by itself (mw-5r3p30.330): the next tap or scroll asks again, without a trip out of the Reader or two two-finger taps.
test('after the phone leaves full screen by itself, the next tap asks for it again', async ({ page }) => {
  await openReader(page, 'on');
  await tapText(page);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  await scrollText(page, 400);
  await expect(page.locator('header').first()).toBeHidden();

  await leaveByItself(page);
  expect(await fullScreen(page)).toBe(false);
  await page.waitForTimeout(300);
  expect((await counts(page)).requests).toBe(1);

  await tapText(page);
  await expect.poll(() => counts(page)).toEqual({ requests: 2, exits: 0 });
  expect(await fullScreen(page)).toBe(true);

  // and asked for once more, not on every tap after it
  await tapText(page);
  await scrollText(page, 300);
  await page.waitForTimeout(400);
  expect((await counts(page)).requests).toBe(2);
});

test('after the browser leaves full screen by itself, a two-finger tap asks for it again, once', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 400);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  await leaveByItself(page);
  expect(await fullScreen(page)).toBe(false);

  await twoFingerTap(page);
  await expect.poll(() => counts(page)).toEqual({ requests: 2, exits: 0 });
  expect(await fullScreen(page)).toBe(true);

  // full screen again: more two-finger taps change only Lampas's bars and ask no more
  await twoFingerTap(page);
  await twoFingerTap(page);
  await page.waitForTimeout(500);
  expect(await counts(page)).toEqual({ requests: 2, exits: 0 });
  expect(await fullScreen(page)).toBe(true);
});

test('after the phone leaves full screen by itself, the next scroll asks for it again',async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 400);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  await leaveByItself(page);
  await scrollText(page, 300);
  await expect.poll(() => counts(page)).toEqual({ requests: 2, exits: 0 });
});

test('a full screen the Reader leaves itself is not asked for again', async ({ page }) => {
  await openReader(page, 'on');
  await tapText(page);
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 0 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect.poll(() => counts(page)).toEqual({ requests: 1, exits: 1 });
  await page.waitForTimeout(400);
  expect(await counts(page)).toEqual({ requests: 1, exits: 1 });
});
