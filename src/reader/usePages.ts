// src/reader/usePages.ts — Turn pages (Settings > Reading, mw-5r3p30.299): the Reader's chapter laid out in pages the size of the reading box, like a
// Kindle. The text (`inner`, [data-pages]) is set in CSS columns one box wide and one box high (src/index.css 'Turn pages'), so the browser breaks it
// between lines, never through one; the reading box (`box`) clips them and shows one column at a time by its scrollLeft. A tap on the right third of
// the text or a swipe to the left turns forward a page, the left third or a swipe to the right turns back; the first page does not turn back, the last
// does not turn forward, and no swipe opens another chapter (the chapter buttons end the last page). A tap on a button or link (a verse number, its play
// button, the chapter buttons) does what it does; a section heading, whose button spans the text's width, is text: its outer thirds turn the page. A tap
// in the middle third still opens the word or heading; so does a long press (the word's own click guard drops its click). The swipe's numbers are the chapter swipe's (src/reader/useChapterSwipe.ts), which is off while pages are on.
// When the box changes size (text size, the hint card closed, the bars brought back) the pages are cut afresh and the page shown is the one where the
// first verse that was in view begins, so no text is skipped.
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { EDGE_PX, SWIPE_MAX_MS, SWIPE_MIN_PX } from './useChapterSwipe';

/** A press longer than this, or one that wandered farther than TAP_SLOP_PX, is not a tap (the word's own long press is 500 ms and 10 px). */
const TAP_MS = 500;
const TAP_SLOP_PX = 10;

export interface Pages {
  /** the page shown, from 1 */
  page: number;
  /** how many pages the chapter has (1 until it is laid out) */
  count: number;
  /** turns a page forward (1) or back (-1), as a tap on the outer thirds or a swipe does: for the Previous and Next page buttons (src/ReaderControls.tsx) */
  turn(by: 1 | -1): void;
  /** turns to the page an element (a verse) begins on: for the verse read aloud, or the teach sheet's verse number */
  show(el: Element): void;
}

/** True when the press began somewhere a swipe or a page tap is not wanted. */
const ignoredStart = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('input, textarea, select, [data-hold-bar], [role="slider"], [contenteditable="true"]') !== null;

/** What the layout effect lets the rest of the hook do while the pages are cut. */
interface Turner {
  turn(by: 1 | -1): void;
  show(el: Element): void;
}

/** Lays out the text of `box` in pages while `enabled`, and turns them by tap and swipe unless `blocked` (a sheet is open). */
export function usePages(enabled: boolean, box: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, blocked: boolean): Pages {
  const [place, setPlace] = useState({ page: 0, count: 1 });
  const turner = useRef<Turner | null>(null);

  // the pages are cut when the text is there and again whenever the box or the text changes
  useEffect(() => {
    const found = box.current;
    const text = inner.current;
    if (!enabled || !found || !text) return;
    const el: HTMLElement = found;
    const content: HTMLElement = text;
    let page = 0;
    let count = 1;
    /** the width of a page and the gap after it */
    let step = 0;
    /** the first verse that began on the page shown: the page is found again by it when the pages are cut afresh */
    let anchor: Element | null = null;

    /** The page an x on screen falls on. */
    const pageAt = (x: number): number => (step <= 0 ? 0 : Math.max(0, Math.floor((x - content.getBoundingClientRect().left + 1) / step)));

    const go = (to: number, keepAnchor = false) => {
      page = Math.max(0, Math.min(count - 1, to));
      setPlace((was) => (was.page === page && was.count === count ? was : { page, count }));
      el.scrollLeft = page * step;
      if (keepAnchor) return;
      // the first verse that begins on this page, else the one that runs across it
      const left = content.getBoundingClientRect().left + page * step;
      const on = (r: DOMRect) => r.width > 0 && r.left >= left - 1 && r.left < left + step - 1;
      const verses = Array.from(content.querySelectorAll('[data-verse]'));
      anchor =
        verses.find((v) => {
          const first = v.getClientRects()[0];
          return first !== undefined && on(first);
        }) ??
        verses.find((v) => Array.from(v.getClientRects()).some(on)) ??
        null;
    };

    /** Cuts the pages afresh: how wide one is, how many there are, and which one shows the anchor. */
    const measure = () => {
      const width = content.clientWidth;
      if (width <= 0) return;
      const before = { step, count };
      step = width + (parseFloat(getComputedStyle(content).columnGap) || 0);
      const last = content.lastElementChild;
      const rects = last ? last.getClientRects() : null;
      count = rects && rects.length > 0 ? pageAt(rects[rects.length - 1].left) + 1 : 1;
      // nothing moved between pages: the page shown stays
      if (step === before.step && count === before.count) {
        go(page, true);
        return;
      }
      const first = anchor?.isConnected ? anchor.getClientRects()[0] : undefined;
      if (first) go(pageAt(first.left), true);
      else go(page);
    };

    turner.current = {
      turn: (by) => {
        const to = page + by;
        if (to >= 0 && to < count) go(to);
      },
      show: (target) => {
        const first = target.getClientRects()[0];
        if (first) go(pageAt(first.left));
      },
    };
    measure();
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    watch?.observe(el);
    watch?.observe(content);
    const changes = typeof MutationObserver === 'function' ? new MutationObserver(measure) : null;
    changes?.observe(content, { childList: true, subtree: true, characterData: true });
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    // the box scrolled by something else (focus moved to a word on another page): the page follows it
    const onScroll = () => {
      if (step <= 0) return;
      const shown = Math.round(el.scrollLeft / step);
      if (shown !== page) go(shown);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      live = false;
      turner.current = null;
      watch?.disconnect();
      changes?.disconnect();
      el.removeEventListener('scroll', onScroll);
      el.scrollLeft = 0;
      setPlace({ page: 0, count: 1 });
    };
  }, [enabled, box, inner]);

  // taps on the thirds and swipes
  useEffect(() => {
    const found = box.current;
    if (!enabled || blocked || !found) return;
    const el: HTMLElement = found;
    let press: { id: number; x: number; y: number; at: number; swipes: boolean } | null = null;
    /** the press that ended last: whether its click may be a tap, and whether it was a swipe (its click, if one comes, is dropped) */
    let tapped = false;
    let swiped = false;
    const turn = (by: 1 | -1) => turner.current?.turn(by);
    const stop = () => {
      press = null;
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    function onCancel() {
      tapped = false;
      stop();
    }
    function onUp(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      stop();
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      const ms = performance.now() - p.at;
      tapped = ms <= TAP_MS && Math.hypot(dx, dy) <= TAP_SLOP_PX;
      if (p.swipes && Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) && ms <= SWIPE_MAX_MS) {
        swiped = true;
        turn(dx < 0 ? 1 : -1);
      }
    }
    const onDown = (e: PointerEvent) => {
      tapped = false;
      swiped = false;
      if (press) {
        // a second finger: neither is a swipe nor a tap
        stop();
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (ignoredStart(e.target)) return;
      // Android's back gesture owns the screen's edges: no swipe starts there (a tap there is still a tap)
      const swipes = e.clientX >= EDGE_PX && e.clientX <= window.innerWidth - EDGE_PX;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), swipes };
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };
    // In the bubble phase, before the app's own click handlers (React's, on the root): a capture guard that already stopped the click (a two-finger
    // tap, src/immersive.ts) keeps it from here too.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (swiped) {
        swiped = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // a click with no short press before it (a long press, Enter on a button) is not a page tap
      if (!tapped) return;
      tapped = false;
      // a heading's button is the whole width of the text: it is text here, opened from the middle third like a word
      const control = e.target instanceof Element ? e.target.closest('a, button, input, select, textarea, label, summary') : null;
      if (control && !control.closest('[data-heading]')) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const by = x < r.width / 3 ? -1 : x > (r.width * 2) / 3 ? 1 : 0;
      if (by === 0) return;
      e.preventDefault();
      e.stopPropagation();
      turn(by);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick);
      stop();
    };
  }, [enabled, blocked, box]);

  const show = useCallback((el: Element) => turner.current?.show(el), []);
  const turn = useCallback((by: 1 | -1) => turner.current?.turn(by), []);

  return { page: place.page + 1, count: place.count, show, turn };
}
