// tests/support/gesture.ts — the one way an e2e spec swipes, and the one way it taps twice (mw-5r3p30.612; holds are tests/support/hold.ts).
// The app times a swipe (it must end within SWIPE_MAX_MS of its start) and the gap between two taps (the settle moment, src/ui/settle.ts) by the
// page's clock: Date.now and performance.now. A spec that times them by the host's clock (a wall-clock wait between two taps, or a drag sent one
// awaited event at a time) leaves the length the page sees to the host: a loaded one takes tens of ms to answer each event, and a swipe then
// outlasts its limit or a double tap outlasts the settle moment. Here the page clock is paused while the gesture is delivered and run for exactly the
// gap asked, so the host's speed cannot change what the page sees. The spec must call page.clock.install() before the page opens
// (tests/unit/e2e-gestures.test.ts keeps every spec on these).
import type { Locator, Page } from '@playwright/test';
import { pauseNow, type PressAt } from './hold';

/** A point on the page: [x, y]. */
export type Point = readonly [number, number];

export interface SwipeOptions {
  /** The input: a mouse drag (default) or a finger, as touch input to the browser (pointer events of type touch). */
  with?: 'mouse' | 'touch';
  /** How many moves the drag is cut into. */
  steps?: number;
  /** Real time to wait after the last move and before the release: a host that delivers the release late. The page's clock does not move. */
  lagMs?: number;
  /** Real time the finger rests at the end before it lifts (touch only): a swipe lifted at speed starts a fling, and Chrome swallows the next tap.
   * The browser's own fling timing runs in real time, so this wait is real; the page's clock is paused through it. */
  restMs?: number;
}

/** The box of `target` once its layout has stopped moving (mw-5r3p30.628). A screen whose controls draw one by one (Settings: each row reads its
 * saved value first) pushes a control down after it is first on the page, so a box read at once is where the control WAS and a finger sent there
 * lands on another. This reads the box every `everyMs` of the host's clock until `times` reads in a row agree (the layout is state, not the page's
 * clock, which a spec has paused or faked); a gesture is aimed at the box it returns, and a box that never settles fails the spec. */
export async function settledBox(target: Locator, { everyMs = 100, times = 5, withinMs = 10_000 }: { everyMs?: number; times?: number; withinMs?: number } = {}): Promise<{ x: number; y: number; width: number; height: number }> {
  const page = target.page();
  const same = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  const until = Date.now() + withinMs;
  let last = await target.boundingBox();
  let agreed = 1;
  while (Date.now() < until) {
    await page.waitForTimeout(everyMs); // a real-time hold: the layout settles on the host's clock, not the page's
    const now = await target.boundingBox();
    agreed = now && last && same(now, last) ? agreed + 1 : 1;
    last = now;
    if (last && agreed >= times) return last;
  }
  throw new Error(`the layout of the target did not settle within ${withinMs} ms`);
}

/** Drags from `from` to `to` inside zero time on the page's clock, however long the host takes to deliver it. */
export async function swipe(page: Page, from: Point, to: Point, { with: input = 'mouse', steps = 8, lagMs = 0, restMs = 0 }: SwipeOptions = {}): Promise<void> {
  const at = (t: number) => ({ x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t });
  if (input === 'mouse') {
    await page.mouse.move(from[0], from[1]);
    await pauseNow(page);
    try {
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) await page.mouse.move(at(i / steps).x, at(i / steps).y);
      if (lagMs) await page.waitForTimeout(lagMs); // a real-time hold: the host's lateness, not the page's
      await page.mouse.up();
    } finally {
      await page.clock.resume();
    }
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', touchPoints: { x: number; y: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await pauseNow(page);
  try {
    await send('touchStart', [at(0)]);
    for (let i = 1; i <= steps; i++) await send('touchMove', [at(i / steps)]);
    if (restMs) {
      await page.waitForTimeout(restMs); // a real-time hold: Chrome's fling timing is the browser's, not the page's
      await send('touchMove', [at(1)]);
    }
    if (lagMs) await page.waitForTimeout(lagMs); // a real-time hold: the host's lateness, not the page's
    await send('touchEnd', []);
  } finally {
    await page.clock.resume();
    await cdp.detach();
  }
}

export interface TapTwiceOptions {
  /** Tap as a finger (page.touchscreen.tap) rather than a mouse click. */
  touch?: boolean;
  /** Real time to wait between the taps, after the page's `gapMs`: a host that delivers the second tap late. The page's clock does not move. */
  lagMs?: number;
  /** Runs after the first tap and the gap, just before the second tap, with the page's clock still paused: wait here for what the first tap brings to be
   * on screen, or look at what stands under the second tap. When it gives a point, the second tap goes there instead of the same spot (what the first
   * tap brought up drew the control a thumb's second tap hit somewhere else at this size). */
  between?: () => Promise<void | Point>;
}

/** Taps the middle of `target` twice, `gapMs` apart on the page's clock (not the host's), as a thumb's double tap. */
export async function tapTwice(page: Page, target: Locator | PressAt, gapMs: number, { touch = false, lagMs = 0, between }: TapTwiceOptions = {}): Promise<void> {
  const box = 'boundingBox' in target ? await target.boundingBox() : target;
  if (!box) throw new Error('the tap target is not on the page');
  const x = box.x + (box.width ?? 0) / 2;
  const y = box.y + (box.height ?? 0) / 2;
  const tap = ([at, to]: Point) => (touch ? page.touchscreen.tap(at, to) : page.mouse.click(at, to));
  await pauseNow(page);
  try {
    await tap([x, y]);
    await page.clock.runFor(gapMs);
    const second = (between && (await between())) || ([x, y] as const);
    if (lagMs) await page.waitForTimeout(lagMs); // a real-time hold: the host's lateness, not the page's
    await tap(second);
  } finally {
    await page.clock.resume();
  }
}

/** Lets `ms` pass on the page's clock, as a wait for something to happen (or not to) that the page itself times. */
export async function pageTime(page: Page, ms: number): Promise<void> {
  await page.clock.runFor(ms);
}

/** Holds a finger (touch input to the browser) on the middle of `target` for `ms` of the page's clock, then lifts. The spec must call page.clock.install()
 * before the page opens. (A held mouse press is holdFor, tests/support/hold.ts.) */
export async function touchHoldFor(page: Page, target: Locator | PressAt, ms: number): Promise<void> {
  const box = 'boundingBox' in target ? await target.boundingBox() : target;
  if (!box) throw new Error('the press target is not on the page');
  const point = { x: box.x + (box.width ?? 0) / 2, y: box.y + (box.height ?? 0) / 2 };
  const cdp = await page.context().newCDPSession(page);
  await pauseNow(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await page.clock.runFor(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await page.clock.resume();
    await cdp.detach();
  }
}
