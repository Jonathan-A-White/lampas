// src/reader/useChapterSwipe.ts — swipe the Reader's text to the next chapter (left) or the previous one (right), across books (mw-5r3p30.126).
// Pointer events on the reading box. A swipe is at least SWIPE_MIN_PX across, more across than down, finished within SWIPE_MAX_MS, and does not
// start within EDGE_PX of either screen edge (Android's back gesture owns those); PROVISIONAL, all four. The text follows the finger a little and
// slides out before the chapter opens (none under prefers-reduced-motion). A vertical drag (the browser takes it and cancels the pointer), a tap or
// long press on a word, text in a sideways-scrolling box, a field, a hold bar, a second finger and an open sheet are never a swipe.
import { type RefObject, useEffect } from 'react';
import { neighbours } from '../data/neighbours';
import type { OpenChapter } from '../data/readerChapter';
import { openReader } from '../nav/route';

export const SWIPE_MIN_PX = 60;
export const SWIPE_MAX_MS = 600;
export const EDGE_PX = 24;
/** The drag shows once it is this far across, and the text moves this share of the finger's way. */
const FOLLOW_AFTER_PX = 10;
const FOLLOW_SHARE = 0.35;
const SLIDE_MS = 140;
/** A click the end of a swipe sends is dropped if it comes within this. */
const CLICK_GUARD_MS = 400;

export type SwipeEnd = 'first' | 'last';

const reducedMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True when the press began somewhere a swipe is not wanted. */
function ignoredStart(target: EventTarget | null, box: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select, [data-hold-bar], [role="slider"], [contenteditable="true"]')) return true;
  for (let el: Element | null = target; el && el !== box; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}

/** Listens on `box`; `inner` is what moves with the finger. `blocked` (a sheet is open) turns it off; `onEnd` hears a swipe past the first or last chapter. */
export function useChapterSwipe(
  box: RefObject<HTMLElement | null>,
  inner: RefObject<HTMLElement | null>,
  book: string,
  chapter: number,
  blocked: boolean,
  onEnd: (end: SwipeEnd) => void,
): void {
  useEffect(() => {
    const found = box.current;
    if (!found || blocked) return;
    const el: HTMLElement = found;
    let press: { id: number; x: number; y: number; at: number; dragging: boolean } | null = null;
    let guardUntil = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const moveInner = (dx: number, animate: boolean) => {
      const node = inner.current;
      if (!node) return;
      node.style.transition = animate ? `transform ${SLIDE_MS}ms ease-out, opacity ${SLIDE_MS}ms ease-out` : '';
      node.style.transform = dx === 0 ? '' : `translateX(${dx}px)`;
      node.style.opacity = animate && Math.abs(dx) > el.clientWidth / 4 ? '0' : '';
    };
    const stop = () => {
      press = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    function onCancel() {
      if (press?.dragging) moveInner(0, !reducedMotion());
      stop();
    }
    function onMove(e: PointerEvent) {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x;
      const dy = e.clientY - press.y;
      if (Math.abs(dx) >= FOLLOW_AFTER_PX && Math.abs(dx) > Math.abs(dy)) {
        press.dragging = true;
        if (!reducedMotion()) moveInner(dx * FOLLOW_SHARE, false);
      } else if (press.dragging) {
        press.dragging = false;
        moveInner(0, false);
      }
    }
    function onUp(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      stop();
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      const swipe = Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) && Date.now() - p.at <= SWIPE_MAX_MS;
      if (!swipe) {
        if (p.dragging) moveInner(0, !reducedMotion());
        return;
      }
      guardUntil = Date.now() + CLICK_GUARD_MS;
      const here = neighbours(book, chapter);
      const to: OpenChapter | null = dx < 0 ? here.next : here.previous;
      if (!to) {
        moveInner(0, !reducedMotion());
        onEnd(dx < 0 ? 'last' : 'first');
        return;
      }
      const go = () => openReader({ book: to.book, chapter: to.chapter });
      if (reducedMotion()) {
        go();
        return;
      }
      moveInner(dx < 0 ? -el.clientWidth / 2 : el.clientWidth / 2, true);
      timer = setTimeout(go, SLIDE_MS);
    }
    const onDown = (e: PointerEvent) => {
      if (press) {
        // a second finger: neither is a swipe
        stop();
        if (e.isPrimary === false) moveInner(0, false);
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.clientX < EDGE_PX || e.clientX > window.innerWidth - EDGE_PX) return;
      if (ignoredStart(e.target, el)) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: Date.now(), dragging: false };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };
    // the click that ends a swipe never taps a word
    const onClick = (e: MouseEvent) => {
      if (Date.now() > guardUntil) return;
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick, true);
      stop();
      clearTimeout(timer);
      moveInner(0, false);
    };
  }, [box, inner, book, chapter, blocked, onEnd]);
}
