// src/reader/useBringVerse.ts — a verse brought to the top of the reading area (mw-5r3p30.678): 'Go to John 18:2' in Choose a book opens the Reader on the chapter,
// as a way into the Bible, not the Verse view; the reading box is scrolled so the verse stands at its top, the rest of the chapter above and below it. The request
// (src/nav/readerRequest.ts openAtVerse, action 'verse') is met once, when the chapter is on screen; the verse is not selected, which would open its Verse view.
// The text above the verse can still grow after the first scroll (the Greek font arrives, a late row), so the verse is put back at the top as the text settles,
// until his own hand is on the box. Moves the box and nothing else.
import { useEffect, type RefObject } from 'react';
import type { Chapter } from '../data/chapter';
import { useLatest } from '../events/bus';
import { moveBox } from '../immersive';
import { pendingRequest, takeRequest } from '../nav/readerRequest';

/** How long after the first scroll the verse is put back at the top when the text above it changes size. */
const SETTLE_MS = 1000;

/** The gap between the top of the box and the verse's top, as showVerse leaves it (src/Reader.tsx). */
const GAP = 8;

/** Puts `verse` at the top of `box` and keeps it there while the text above it settles (a font arriving, a late row), until his own hand is on the box or SETTLE_MS is up.
 * Returns the function that ends it. */
export function settleAtTop(box: HTMLElement, inner: HTMLElement | null, verse: number): () => void {
  const bring = () => {
    const target = box.querySelector<HTMLElement>(`[data-verse="${verse}"]`);
    if (target) moveBox(box, box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top - GAP);
  };
  bring();
  const touches = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  let observer: ResizeObserver | undefined;
  const done = () => {
    observer?.disconnect();
    clearTimeout(timer);
    for (const type of touches) box.removeEventListener(type, done);
  };
  for (const type of touches) box.addEventListener(type, done, { passive: true });
  const timer = setTimeout(done, SETTLE_MS);
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(bring);
    observer.observe(inner ?? box);
  }
  return done;
}

/** Brings the verse a request names to the top of `main` and says which on the box (data-brought-verse, for a test: the box has no other sign of a scroll, and the
 * attribute is set here, not by React, so it is not an effect's state). `show` turns the page in Turn pages mode. */
export function useBringVerse(
  main: RefObject<HTMLElement | null>,
  inner: RefObject<HTMLElement | null>,
  book: string,
  chapterN: number,
  chapter: Chapter | null,
  paging: boolean,
  show: (el: Element) => void,
): void {
  const requested = useLatest('reader-requested');
  // another chapter has no verse brought to its top yet
  useEffect(() => {
    const box = main.current;
    return () => box?.removeAttribute('data-brought-verse');
  }, [book, chapterN, main]);
  useEffect(() => {
    const request = pendingRequest();
    if (request?.action !== 'verse' || request.book !== book || request.chapter !== chapterN) return;
    // the chapter that was on screen before this one is not the one asked for
    if (!chapter || chapter.code !== book || chapter.chapter !== chapterN) return;
    const box = main.current;
    if (!box) return;
    // the verses draw once the reader's settings are read, a moment after the chapter is here: the request waits for its verse to be in the box
    let watcher: MutationObserver | undefined;
    let stop: (() => void) | undefined;
    const start = (): boolean => {
      const el = box.querySelector<HTMLElement>(`[data-verse="${request.verse}"]`);
      if (!el) return false;
      watcher?.disconnect();
      takeRequest(request);
      box.setAttribute('data-brought-verse', String(request.verse));
      if (paging) show(el);
      else stop = settleAtTop(box, inner.current, request.verse);
      return true;
    };
    if (!start()) {
      watcher = new MutationObserver(start);
      watcher.observe(box, { childList: true, subtree: true });
    }
    return () => {
      watcher?.disconnect();
      stop?.();
    };
  }, [requested, book, chapterN, chapter, paging, show, main, inner]);
}
