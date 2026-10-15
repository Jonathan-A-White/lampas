// src/immersive.ts — the Immersive reader (Settings > Immersive reader, mw-5r3p30.120). With it On, the Reader's header, row of chips, Talk bar and
// round Ask button slide away while he scrolls the text down, as a browser's address bar does. After that the bars change ONLY on a two-finger tap
// on the text: shown if away, away if shown (mw-5r3p30.255, his words: "2 fingers on, 2 fingers off"). Nothing else brings them back: not
// scrolling up (mw-5r3p30.227), not the end of the chapter or scrolling past it, not a sheet closing, not reading aloud stopping. A three-finger tap
// does nothing. No gesture from a screen's edge: Android's gesture navigation owns the edges. The hook only decides `away`; src/Away.tsx draws the
// sliding.
//
// Full screen (mw-5r3p30.296, once per visit mw-5r3p30.316): with it On, his first tap or scroll in the text asks the browser for full screen (the
// Fullscreen API needs a gesture), so the phone's status and navigation bars go away too, and it STAYS: Chrome shows its own "To exit full screen"
// notice every time a page enters full screen (no page can hide it or learn it was swiped away), so entering again after every two-finger tap would
// bring the notice back each time. A two-finger tap changes only Lampas's own bars. Full screen is left when he leaves the Reader and when the
// setting goes Off. Where the API is missing or refuses, nothing else changes and the next gesture asks again.
//
// Awake (mw-5r3p30.309): with it On the screen stays on while the Reader is open (src/speech/wakeLock.ts, holder 'immersive', beside reading aloud's own
// hold: the lock is let go with the last holder). Leaving the Reader or switching Off lets it go; the page hiding does so by itself and the lock is asked
// for again when the page is visible again. A phone without the API reads on.
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { holdAwake, releaseAwake } from './speech/wakeLock';

/** Scrolling down this far hides them. */
export const HIDE_AFTER_PX = 12;
/** Nearer the end of the text than this, scrolling down does not hide them: hiding grows the box, and would push the end of the chapter under them. */
const NEAR_END_PX = 320;
/** Two fingers that stay down for longer than this, or move farther than TAP_SLOP_PX, are not a tap. */
const TAP_MS = 500;
const TAP_SLOP_PX = 16;
/** A click the phone sends after a two-finger tap (it should not) is dropped if it comes within this. The times here are performance.now(), which a
 * clock adjustment cannot move (Date.now() stepped back on the Laptop and the guard then dropped a later real tap). */
const CLICK_GUARD_MS = 600;

/** A Reader that goes away and is replaced at once (the next chapter) keeps the screen full: the exit waits this long for a new Reader to say it still wants it. */
const LEAVE_DELAY_MS = 250;
const AWAKE_HOLDER = 'immersive';
let leaving: ReturnType<typeof setTimeout> | undefined;

/** Asks the browser to show the page full screen. False where it cannot or will not (no API, no gesture yet, refused). */
async function enterFullScreen(): Promise<boolean> {
  const root = document.documentElement;
  if (document.fullscreenElement) return true;
  if (typeof root.requestFullscreen !== 'function') return false;
  try {
    await root.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

/** Leaves full screen if the page is in it; quiet where there is nothing to leave or the browser refuses. */
function leaveFullScreen(): void {
  // the timer outlives its page when the page is torn down first (a test's jsdom, a closing window): nothing to leave then
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') return;
  try {
    void document.exitFullscreen().catch(() => {});
  } catch {
    // a browser that throws instead of rejecting: nothing to do
  }
}

/** Drops a pending leave-full-screen timer without leaving: for the end of a page's life (a test's After hook), when the timer must not fire into what comes next. */
export function resetImmersive(): void {
  clearTimeout(leaving);
  leaving = undefined;
}

export interface Immersive {
  /** the bars are out of view */
  away: boolean;
}

/** Decides whether the bars are away, from the scrolling of `box` and two-finger taps on it. With `enabled` false nothing is listened to and they are never away. */
export function useImmersive(
  enabled: boolean,
  box: RefObject<HTMLElement | null>,
): Immersive {
  const [away, setAway] = useState(false);
  const awayRef = useRef(false);
  const set = useCallback((value: boolean) => {
    awayRef.current = value;
    setAway(value);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    clearTimeout(leaving);
    leaving = undefined;
    holdAwake(AWAKE_HOLDER);
    let last = el.scrollTop;
    let down = 0;
    let stopped = false;

    // Full screen: asked for on a gesture until the browser says yes, then never again in this visit; a refusal (no gesture yet, no API) lets the
    // next tap ask again (a scroll is no user gesture, so it tries once only: scrollTried)
    let entered = false;
    let scrollTried = false;
    let asking = false;
    const enter = (byScroll: boolean) => {
      if (entered || asking || (byScroll && scrollTried)) return;
      if (byScroll) scrollTried = true;
      asking = true;
      void enterFullScreen().then((ok) => {
        asking = false;
        entered = ok;
        // switched Off or left while the browser was deciding
        if (ok && stopped) leaveFullScreen();
      });
    };
    // two fingers have been down since the last time all were up
    let multi = false;
    const toggle = () => {
      set(!awayRef.current);
    };
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - last;
      last = top;
      if (delta === 0) return;
      const toEnd = el.scrollHeight - top - el.clientHeight;
      if (delta > 0) {
        down += delta;
        if (!awayRef.current && down >= HIDE_AFTER_PX && top > 0 && toEnd > NEAR_END_PX) {
          set(true);
        }
      } else {
        // scrolling up changes nothing: he reads up and down and wants no bars coming and going
        down = 0;
      }
      enter(true);
    };

    // a two-finger tap: the fingers land together (a touchstart each), go up again soon, none moved
    let tap: { at: number; from: Array<{ x: number; y: number }> } | null = null;
    let guardUntil = 0;
    const onTouchStart = (e: TouchEvent) => {
      const n = e.touches.length;
      if (n < 2) return;
      multi = true;
      if (n > 2) {
        // a third finger makes it a gesture of its own
        tap = null;
        return;
      }
      // one finger is no tap yet; the second starts the clock
      tap = { at: performance.now(), from: Array.from(e.touches, (t) => ({ x: t.clientX, y: t.clientY })) };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tap) return;
      const start = tap.from;
      const moved = Array.from(e.touches).some((t, i) => start[i] && Math.hypot(t.clientX - start[i].x, t.clientY - start[i].y) > TAP_SLOP_PX);
      if (moved) tap = null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      const wasMulti = multi;
      multi = false;
      // one finger lifted: a tap, or the end of a scroll
      if (!wasMulti) {
        enter(false);
        return;
      }
      if (!tap) return;
      const { at } = tap;
      tap = null;
      if (performance.now() - at > TAP_MS) return;
      guardUntil = performance.now() + CLICK_GUARD_MS;
      toggle();
    };
    const onTouchCancel = () => {
      tap = null;
      multi = false;
    };
    // a two-finger tap never taps a word
    const onClick = (e: MouseEvent) => {
      if (performance.now() > guardUntil) {
        enter(false);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });
    el.addEventListener('click', onClick, true);
    return () => {
      // switched Off (or the box gone): the bars are shown again if he switches it back On
      set(false);
      releaseAwake(AWAKE_HOLDER);
      stopped = true;
      leaving = setTimeout(leaveFullScreen, LEAVE_DELAY_MS);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
      el.removeEventListener('click', onClick, true);
    };
  }, [enabled, box, set]);

  return { away: enabled && away };
}

/** How far through the text of `box` he has scrolled, 0 to 100 (a text that fits is all of it: 100). */
export function scrolledPercent(top: number, scrollHeight: number, clientHeight: number): number {
  const range = scrollHeight - clientHeight;
  if (range <= 0) return 100;
  return Math.max(0, Math.min(100, Math.floor((top / range) * 100)));
}

/** The percent of `box` scrolled through, kept current while `enabled` (it follows the scrolling and any change of size of the box or its text). */
export function useScrolledPercent(enabled: boolean, box: RefObject<HTMLElement | null>): number {
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    const read = () => setPercent(scrolledPercent(el.scrollTop, el.scrollHeight, el.clientHeight));
    read();
    el.addEventListener('scroll', read, { passive: true });
    // the text arrives after the box, and the box grows when the bars go: the percent is of what is there now
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(read) : null;
    if (watch) {
      watch.observe(el);
      for (const child of Array.from(el.children)) watch.observe(child);
    }
    return () => {
      el.removeEventListener('scroll', read);
      watch?.disconnect();
    };
  }, [enabled, box]);
  return percent;
}
