// src/immersive.ts — the Immersive reader (Settings > Immersive reader, mw-5r3p30.120). With it On, the Reader's header, row of chips, Talk bar and
// round Ask button slide away while he scrolls the text down, as a browser's address bar does. After that the bars change ONLY on a two-finger tap
// on the text: shown if away, away if shown (mw-5r3p30.255, his words: "2 fingers on, 2 fingers off"). Nothing else brings them back: not
// scrolling up (mw-5r3p30.227), not the end of the chapter or scrolling past it, not a sheet closing, not reading aloud stopping. A three-finger tap
// does nothing. No gesture from a screen's edge: Android's gesture navigation owns the edges. The hook only decides `away`; src/Away.tsx draws the
// sliding.
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

/** Scrolling down this far hides them. */
export const HIDE_AFTER_PX = 12;
/** Nearer the end of the text than this, scrolling down does not hide them: hiding grows the box, and would push the end of the chapter under them. */
const NEAR_END_PX = 320;
/** Two fingers that stay down for longer than this, or move farther than TAP_SLOP_PX, are not a tap. */
const TAP_MS = 500;
const TAP_SLOP_PX = 16;
/** A click the phone sends after a two-finger tap (it should not) is dropped if it comes within this. */
const CLICK_GUARD_MS = 600;

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
  const toggle = useCallback(() => set(!awayRef.current), [set]);

  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    let last = el.scrollTop;
    let down = 0;
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - last;
      last = top;
      if (delta === 0) return;
      const toEnd = el.scrollHeight - top - el.clientHeight;
      if (delta > 0) {
        down += delta;
        if (!awayRef.current && down >= HIDE_AFTER_PX && top > 0 && toEnd > NEAR_END_PX) set(true);
      } else {
        // scrolling up changes nothing: he reads up and down and wants no bars coming and going
        down = 0;
      }
    };

    // a two-finger tap: the fingers land together (a touchstart each), go up again soon, none moved
    let tap: { at: number; from: Array<{ x: number; y: number }> } | null = null;
    let guardUntil = 0;
    const onTouchStart = (e: TouchEvent) => {
      const n = e.touches.length;
      if (n < 2) return;
      if (n > 2) {
        // a third finger makes it a gesture of its own
        tap = null;
        return;
      }
      // one finger is no tap yet; the second starts the clock
      tap = { at: Date.now(), from: Array.from(e.touches, (t) => ({ x: t.clientX, y: t.clientY })) };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tap) return;
      const start = tap.from;
      const moved = Array.from(e.touches).some((t, i) => start[i] && Math.hypot(t.clientX - start[i].x, t.clientY - start[i].y) > TAP_SLOP_PX);
      if (moved) tap = null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tap || e.touches.length > 0) return;
      const { at } = tap;
      tap = null;
      if (Date.now() - at > TAP_MS) return;
      guardUntil = Date.now() + CLICK_GUARD_MS;
      toggle();
    };
    const onTouchCancel = () => {
      tap = null;
    };
    // a two-finger tap never taps a word
    const onClick = (e: MouseEvent) => {
      if (Date.now() > guardUntil) return;
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
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
      el.removeEventListener('click', onClick, true);
    };
  }, [enabled, box, set, toggle]);

  return { away: enabled && away };
}
