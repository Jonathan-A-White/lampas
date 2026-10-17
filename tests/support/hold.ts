// tests/support/hold.ts — the one way an e2e spec holds a press (mw-5r3p30.388; reading-check's since mw-5r3p30.339).
// The app times a hold by the page's clock, so the spec drives that clock: it is paused while the press is down and run for exactly `ms`,
// and a loaded host that delivers the press or the release late (`lagMs`, real time) cannot make a tap a hold or a short hold a long one.
// tests/unit/e2e-holds.test.ts keeps every spec on it.
import type { Locator, Page } from '@playwright/test';

/** A box (a boundingBox) is pressed at its middle; a point where it is. */
export type PressAt = { x: number; y: number; width?: number; height?: number };

export interface HoldOptions {
  /** Real time to wait after the page's `ms` and before the release: a host that delivers the release late. */
  lagMs?: number;
  /** Pixels to drag sideways while the press is down, as a finger that moves: a drag is not a hold. */
  drag?: number;
}

/** Pauses the page clock a moment ahead of the page's now. A loaded host can take longer than the margin between reading the page's
 * time and pausing, and Playwright refuses to pause in the past, so it reads the time again with a wider margin. */
async function pauseNow(page: Page): Promise<void> {
  for (const margin of [50, 250, 1000]) {
    try {
      await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + margin));
      return;
    } catch (error) {
      if (!String(error).includes('Cannot fast-forward to the past') || margin === 1000) throw error;
    }
  }
}

/** Holds a press on `target` for `ms` of the page's clock. The spec must call page.clock.install() before the page opens. */
export async function holdFor(page: Page, target: Locator | PressAt, ms: number, { lagMs = 0, drag = 0 }: HoldOptions = {}): Promise<void> {
  const box = 'boundingBox' in target ? await target.boundingBox() : target;
  if (!box) throw new Error('the press target is not on the page');
  const x = box.x + (box.width ?? 0) / 2;
  const y = box.y + (box.height ?? 0) / 2;
  await page.mouse.move(x, y);
  await pauseNow(page);
  await page.mouse.down();
  if (drag) await page.mouse.move(x + drag, y, { steps: 4 });
  await page.clock.runFor(ms);
  if (lagMs) await page.waitForTimeout(lagMs);
  await page.mouse.up();
  await page.clock.resume();
}
