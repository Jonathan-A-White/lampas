// src/immersive.ts — the Immersive reader (Settings > Immersive reader, mw-5r3p30.120). With it On, the Reader's header, row of chips, Talk bar and
// round Ask button slide away while he scrolls the text down, as a browser's address bar does, and come back when he scrolls up by SHOW_BACK_PX, taps
// the text with two fingers, reaches the chapter's end, or (the caller asks) a sheet closes or reading aloud stops. No gesture from a screen's
// edge: Android's gesture navigation owns the edges. The hook only decides `away`; src/Away.tsx draws the sliding.
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

/** Scrolling up this far, in one go, brings the bars back. */
export const SHOW_BACK_PX = 24;
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
  /** bring them back (a sheet closed, reading aloud stopped) */
  show: () => void;
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
  const show = useCallback(() => {
    if (awayRef.current) set(false);
  }, [set]);

  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    let last = el.scrollTop;
    let down = 0;
    let up = 0;
    // The bars sliding changes the box's height, and the browser may move the text with it (clamping it at the end): that is not him scrolling.
    // The scroll events of a frame come before its animation callbacks, so a resize seen in one frame covers the scroll events of the next.
    let resizing = false;
    const settled = () => {
      resizing = false;
    };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
      resizing = true;
      requestAnimationFrame(settled);
    });
    observer?.observe(el);
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - last;
      last = top;
      // a resize only ever moves the text up (the browser clamps it at the end), so only an upward move during one is ignored
      if (delta === 0 || (resizing && delta < 0)) return;
      const toEnd = el.scrollHeight - top - el.clientHeight;
      if (delta > 0) {
        up = 0;
        down += delta;
        if (!awayRef.current && down >= HIDE_AFTER_PX && top > 0 && toEnd > NEAR_END_PX) set(true);
      } else {
        down = 0;
        up -= delta;
        if (up >= SHOW_BACK_PX) set(false);
      }
      // the top and the end of the text are where he may want them
      if (top <= 0 || toEnd < 2) set(false);
    };

    // a two-finger tap: both fingers down together, up again soon, neither moved
    let tap: { at: number; from: Array<{ x: number; y: number }> } | null = null;
    let guardUntil = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        tap = { at: Date.now(), from: Array.from(e.touches, (t) => ({ x: t.clientX, y: t.clientY })) };
      } else if (e.touches.length > 2) {
        tap = null;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tap) return;
      const start = tap.from;
      const moved = Array.from(e.touches).some((t, i) => start[i] && Math.hypot(t.clientX - start[i].x, t.clientY - start[i].y) > TAP_SLOP_PX);
      if (moved) tap = null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tap || e.touches.length > 0) return;
      const quick = Date.now() - tap.at <= TAP_MS;
      tap = null;
      if (!quick) return;
      guardUntil = Date.now() + CLICK_GUARD_MS;
      show();
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
      observer?.disconnect();
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
      el.removeEventListener('click', onClick, true);
    };
  }, [enabled, box, set, show]);

  return { away: enabled && away, show };
}
