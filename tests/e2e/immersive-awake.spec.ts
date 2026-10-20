import { expect, test, type Page } from '@playwright/test';
import { openUnlocked } from './unlocked';

// The Immersive reader keeps the screen awake while the Reader is open (mw-5r3p30.309): it holds a screen wake lock, lets it go on leaving the Reader
// and when the setting goes Off, and asks again when the page is visible again (the browser drops the lock whenever the page hides). Where the API is
// absent the Reader still works. Headless Chromium has a real navigator.wakeLock that may refuse, so it is stood in for by hand (window.__wake).
test.use({ viewport: { width: 390, height: 844 } });

interface Wake {
  requests: number;
  released: number;
  /** locks that were asked for and not let go (the ones the screen is held by) */
  held: number;
}
declare global {
  interface Window {
    __wake: Wake;
  }
}

async function fakeWakeLock(page: Page, present: boolean) {
  await page.addInitScript((here: boolean) => {
    const wake = { requests: 0, released: 0, held: 0 };
    window.__wake = wake;
    if (!here) {
      Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, value: undefined });
      return;
    }
    Object.defineProperty(Navigator.prototype, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          wake.requests += 1;
          wake.held += 1;
          let open = true;
          const listeners: Array<() => void> = [];
          return {
            addEventListener: (_: string, fn: () => void) => listeners.push(fn),
            release: async () => {
              if (!open) return;
              open = false;
              wake.released += 1;
              wake.held -= 1;
            },
          };
        },
      },
    });
  }, present);
}

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

async function openReader(page: Page, immersive: 'on' | 'off', wakeLock = true) {
  await fakeWakeLock(page, wakeLock);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keepImmersive(page, immersive);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
}

const wake = (page: Page) => page.evaluate(() => ({ ...window.__wake }));

test('with Immersive reader On the Reader holds a screen wake lock, and leaving the Reader lets it go', async ({ page }) => {
  await openReader(page, 'on');
  await expect.poll(async () => (await wake(page)).held).toBe(1);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await expect.poll(async () => (await wake(page)).held).toBe(0);
  expect((await wake(page)).requests).toBe(1);
});

test('with Immersive reader Off the Reader holds no wake lock', async ({ page }) => {
  await openReader(page, 'off');
  await page.waitForTimeout(600);
  expect(await wake(page)).toEqual({ requests: 0, released: 0, held: 0 });
});

test('where the phone has no wake lock the Reader still works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openReader(page, 'on', false);
  await page.evaluate(() => {
    (document.querySelector('[data-reader]') as HTMLElement).scrollTop += 400;
  });
  await expect(page.locator('header').first()).toBeHidden();
  await expect(page.locator('[data-verse="1"]')).toBeAttached();
  expect(errors).toEqual([]);
});
