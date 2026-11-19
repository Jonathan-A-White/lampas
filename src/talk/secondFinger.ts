// src/talk/secondFinger.ts — a second finger scrolls while a bar is held (mw-06ggew.16). The kit's bar is `touch-action: none` (so a pan on the holding finger cannot send pointercancel and drop the hold), and
// Chrome applies one gesture's touch-actions to all its fingers: with a finger on the bar a second finger on the passage never pans. So, while a touch is down on a bar, the next touch's own
// moves drag the nearest scroll box under it; the second touch is not the bar's, so the hold is neither ended nor cancelled by it, and the holding finger's lift still sends once.
// A second touch that lands ON the bar (mw-06ggew.20) is kept from the kit altogether: its pointerdown, moves, pointerup and pointercancel are stopped in the capture phase, because
// the kit's bar takes any pointerup as the end of the hold.
import { useEffect } from 'react';

const BAR = '.bk-composer__bar'; // the kit's bar: Lampas's own (`.lp-bar`) and the one in the kit's Composer

/** The nearest box under `from` that can scroll up and down, or the page's own. */
function scrollBoxOf(from: Element | null): HTMLElement | null {
  for (let el = from; el instanceof HTMLElement; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

let watchers = 0;
let unwatch: (() => void) | null = null;

/** Starts the watch for a second finger while a bar is mounted (shared by every bar: one set of listeners). */
function watchSecondFinger(): () => void {
  if (watchers++ === 0) {
    let holding: number | null = null;
    let second: { id: number; y: number; box: HTMLElement | null } | null = null;
    const onBarTouches = new Set<number>(); // other touches that landed on the held bar: the kit never sees them
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const onBar = e.target instanceof Element && e.target.closest(BAR) !== null;
      if (holding === null) {
        if (onBar) holding = e.pointerId;
        return;
      }
      if (onBar && e.pointerId !== holding) {
        onBarTouches.add(e.pointerId);
        e.stopPropagation();
        return;
      }
      if (!onBar && second === null && e.pointerId !== holding) second = { id: e.pointerId, y: e.clientY, box: scrollBoxOf(e.target instanceof Element ? e.target : null) };
    };
    const move = (e: PointerEvent) => {
      if (onBarTouches.has(e.pointerId)) e.stopPropagation();
      if (second === null || e.pointerId !== second.id) return;
      if (second.box) second.box.scrollTop -= e.clientY - second.y;
      second.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (onBarTouches.delete(e.pointerId)) {
        e.stopPropagation();
        return;
      }
      if (e.pointerId === holding) {
        holding = null;
        second = null;
        onBarTouches.clear();
      } else if (second !== null && e.pointerId === second.id) second = null;
    };
    const opts = { capture: true } as const; // not passive: a pointer event is not cancelable, and stopPropagation is all it takes
    window.addEventListener('pointerdown', down, opts);
    window.addEventListener('pointermove', move, opts);
    window.addEventListener('pointerup', up, opts);
    window.addEventListener('pointercancel', up, opts);
    unwatch = () => {
      window.removeEventListener('pointerdown', down, opts);
      window.removeEventListener('pointermove', move, opts);
      window.removeEventListener('pointerup', up, opts);
      window.removeEventListener('pointercancel', up, opts);
    };
  }
  return () => {
    if (--watchers === 0) unwatch?.();
  };
}

/** A hold bar is on screen: a second finger scrolls what it lands on while the bar is held. */
export function useSecondFingerScroll(): void {
  useEffect(watchSecondFinger, []);
}
