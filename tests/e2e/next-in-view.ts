// tests/e2e/next-in-view.ts: after he answers, the button that moves on is fully on the screen with no scroll (mw-5r3p30.377).
import { expect, type Locator, type Page } from '@playwright/test';

/** The phones the Governor reads on: 390x844, the 412x892 of his Chrome (1080x2340) and 360x740, the same screen at its 3x density with Chrome's bar on. */
export const PHONES = [
  { name: '390x844', size: { width: 390, height: 844 } },
  { name: '412x892', size: { width: 412, height: 892 } },
  { name: '360x740', size: { width: 360, height: 740 } },
];

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The button is whole inside the window (nothing of it below the fold) and the round Ask the tutor button is not drawn over it. */
export async function expectInView(page: Page, button: Locator, where: string): Promise<void> {
  await expect(button, where).toBeVisible();
  const box = await button.boundingBox();
  const view = page.viewportSize();
  if (!box || !view) throw new Error(`${where}: no box`);
  expect(box.y, `${where}: top`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${where}: its bottom is ${box.y + box.height} in a window ${view.height} high`).toBeLessThanOrEqual(view.height);
  expect(box.x + box.width, `${where}: right`).toBeLessThanOrEqual(view.width);
  // not clipped by the scroll box it is in: inside that box's own edges (the nearest ancestor that scrolls)
  const scroller = await button.evaluate((el) => {
    for (let up = el.parentElement; up; up = up.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(up).overflowY)) {
        const box = up.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }
    }
    return null;
  });
  if (scroller) {
    expect(box.y, `${where}: above the scroll box`).toBeGreaterThanOrEqual(scroller.top - 0.5);
    expect(box.y + box.height, `${where}: below the scroll box (its bottom ${scroller.bottom})`).toBeLessThanOrEqual(scroller.bottom + 0.5);
  }
  // the round Ask button is hidden while a sheet is up
  const ask = (await page.locator('button[data-ask-tutor]').count()) > 0 ? await page.locator('button[data-ask-tutor]').boundingBox() : null;
  if (ask) expect(meets(box, ask), `${where}: the Ask button is over it`).toBe(false);
}

/** Opens `hash` on a phone whose text is set to `percent` of its own size (Settings > Text size writes the same row, which the app reads as it starts). */
export async function openWithTextSize(page: Page, hash: string, percent: number): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'textSize', value: String(value) });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    percent,
  );
  await page.goto(`/${hash}`);
  await page.reload();
}
