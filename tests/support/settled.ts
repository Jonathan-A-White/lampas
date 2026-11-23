// tests/support/settled.ts — the one shared wait for a thing the page is still bringing (mw-fnvjof.17.236, the class of mw-fnvjof.17.113's expectInWindow).
// A spec that takes one look at a thing the moment a nearby element shows (the Study this row once Next is there, the lit verse once its mark is on, scrolled to the box's top) reads it
// on its way: on a calm host the page has finished by then, and on a host at two to five times its cores it has not, and the spec fails whole runs while passing alone. This waits on the
// thing itself: it looks again, with expect.poll (so the host's load only lengthens it, and a fixed sleep never decides), until the look shows nothing wrong, and gives that look back.
import { expect, type Page } from '@playwright/test';

/** How long a thing may take to settle: the test's own timeout still ends a wait that is longer. */
export const SETTLE_MS = 30_000;

/**
 * Looks (`look`: one read of the page, as plain data) again and again until `problem` finds nothing wrong with it (null), and returns that look. `problem` says in a sentence what is
 * wrong, so a thing that never comes is named by what was wrong at the last look. Put the whole condition in `problem`: a wait on one side followed by a one-shot look at the other fails
 * while the page is still on its way.
 */
export async function untilSettled<T>(look: () => Promise<T>, problem: (seen: T) => string | null, options: { message?: string; timeout?: number } = {}): Promise<T> {
  let last: T | undefined;
  await expect
    .poll(
      async () => {
        last = await look();
        return problem(last) ?? 'settled';
      },
      { message: options.message ?? 'the thing settles', timeout: options.timeout ?? SETTLE_MS },
    )
    .toBe('settled');
  return last as T;
}

/**
 * Resolves once the page has drawn `frames` frames (requestAnimationFrame, the browser's own frames, not a time): a scroll event and the handlers it starts run before a frame's callbacks, and
 * a state change they make is drawn by the next frame or two, so a spec that must see that nothing changed after a gesture looks after these, not after a sleep. A loaded host draws its frames
 * late, and the wait is as long as it takes. Not for a page whose clock the spec has faked (page.clock fakes requestAnimationFrame too): run that page's time instead.
 */
export async function afterFrames(page: Page, frames = 4): Promise<void> {
  await page.evaluate(async (n) => {
    for (let i = 0; i < n; i += 1) await new Promise<void>((done) => requestAnimationFrame(() => done()));
  }, frames);
}

/** What one look at a box shows: its place and size, as plain numbers. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Waits until the page has stopped moving and returns the boxes of `selectors` (in order) as they are then: no CSS transition or animation is running (the Immersive reader's bars
 * slide for 200 ms, the place line's row with them), the fonts are loaded, nothing is aria-busy, and every box is the same over `frames` frames in a row. A thing that arrives late (a row
 * that grows the box) starts the count again. The wait is on the page's own state, so a loaded host only lengthens it.
 */
export async function untilStill(page: Page, selectors: string | string[] = '[data-reader]', frames = 5): Promise<Rect[]> {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const seen = await untilSettled(
    () =>
      page.evaluate(
        async ({ list, frames }) => {
          const boxes = () =>
            list.map((selector) => {
              const r = document.querySelector(selector)?.getBoundingClientRect();
              return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
            });
          const key = () => JSON.stringify(boxes());
          const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));
          let last = key();
          let still = 0;
          for (let i = 0; i < frames * 4 && still < frames; i += 1) {
            await frame();
            const now = key();
            still = now === last ? still + 1 : 0;
            last = now;
          }
          const missing = list.filter((_, i) => boxes()[i] === null);
          return { boxes: boxes(), still: still >= frames, animations: document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.playState === 'running').length, fonts: document.fonts.status, busy: document.querySelector('[aria-busy="true"]') !== null, missing };
        },
        { list, frames },
      ),
    (s) =>
      s.missing.length > 0 ? `no ${s.missing.join(', ')}` : s.animations > 0 ? `${s.animations} animation(s) still running` : s.fonts !== 'loaded' ? `fonts ${s.fonts}` : s.busy ? 'a screen is still aria-busy' : !s.still ? 'the boxes are still moving' : null,
    { message: 'the page stops moving' },
  );
  return seen.boxes as Rect[];
}

/** Waits until the Reader's place has been written to the phone (src/nav/lastRoute.ts, 250 ms after the last scroll): some address keeps an offset of `min` or more. */
export async function untilPlaceKept(page: Page, min: number): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((least) => {
          const kept = JSON.parse(window.localStorage.getItem('lampas.scrolls') ?? '{}') as Record<string, Record<string, number>>;
          return Object.values(kept).some((own) => Object.values(own).some((top) => top >= least));
        }, min),
      { message: `a place of ${min} or more is kept on the phone` },
    )
    .toBe(true);
}

/**
 * Lets the Reader's put-back of a saved place run its course, then looks once more at the frames after it, for a spec that holds that the bars did not move in that window. The Reader's box
 * carries data-restoring while the saved place is being put back (src/nav/scrollMemory.ts: from the place being asked for until the text has stayed unchanged for QUIET_MS), so this waits for it
 * to be gone. Call it once the place has been seen back (a poll on the box's scrollTop): the attribute is set before the box is moved, so it is on the page by then.
 */
export async function afterRestore(page: Page): Promise<void> {
  await expect(page.locator('[data-reader]'), 'the Reader has put the saved place back').not.toHaveAttribute('data-restoring', /.*/);
  await afterFrames(page);
}

/** How long after a two-finger tap on the Reader's text the app drops a click (CLICK_GUARD_MS in src/immersive.ts: the click a phone may send after the tap). */
const TWO_FINGER_CLICK_GUARD_MS = 600;

/**
 * Lets the app's click guard of a two-finger tap run out, for a spec that taps a button next: until it has, a click is dropped and does nothing. The guard is the page's own 600 ms (measured
 * with performance.now) and nothing on the page says when it ends, so this is a real-time hold, 1.5 times that.
 */
export async function afterTwoFingerTap(page: Page): Promise<void> {
  await page.waitForTimeout(TWO_FINGER_CLICK_GUARD_MS * 1.5); // a real-time wait: the Reader drops any click for 600 ms after a two-finger tap (src/immersive.ts CLICK_GUARD_MS), by the page's performance.now, and nothing on the page says when that ends
}
