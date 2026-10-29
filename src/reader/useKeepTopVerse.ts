// src/reader/useKeepTopVerse.ts — the verse on top stays on top when the mode changes (mw-5r3p30.863). English, Weave and Greek (Hebrew) lay the same verses out at different
// heights, so the pixel offset the box was at is another verse in the next mode: the switch must carry the place by the verse. The verse on top is noted as the box scrolls and as its
// text changes size, and put back at the top once the new mode's text is on screen, kept there as it settles
// (src/reader/useBringVerse.ts settleAtTop) until his own hand is on the box. Turn pages keeps its own anchor (src/reader/usePages.ts); moves the box and nothing else.
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { settleAtTop } from './useBringVerse';

/** The number of the verse on top of `box`: the first whose top is at or below the box's top, else (the box is past the start of the last one) the last. Null where the box
 * is at its very top (nothing to keep: the chapter's heading stays above verse 1) or shows no verse. */
export function topVerse(box: HTMLElement | null): number | null {
  if (!box || box.scrollTop < 1) return null;
  const top = box.getBoundingClientRect().top;
  const verses = [...box.querySelectorAll<HTMLElement>('[data-verse]')];
  const first = verses.find((el) => el.getBoundingClientRect().top >= top);
  const verse = first ?? verses[verses.length - 1];
  const n = Number(verse?.getAttribute('data-verse'));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Keeps the verse that is on top of `main` on top when `mode` (what the text is laid out as: the view, the Weave, its plain English and its order) changes.
 * The verse on top is noted as the box scrolls or the text changes size (both come after a commit, so the note is the text as it stood before the mode changed), and the layout
 * effect of the new mode, which runs before either, brings that verse to the top of the text now on screen. */
export function useKeepTopVerse(main: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, mode: string, paging: boolean): void {
  const noted = useRef<number | null>(null);
  useEffect(() => {
    const box = main.current;
    if (!box || paging) return;
    const note = () => {
      noted.current = topVerse(box);
    };
    note();
    box.addEventListener('scroll', note, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(note);
    observer?.observe(inner.current ?? box);
    return () => {
      box.removeEventListener('scroll', note);
      observer?.disconnect();
    };
  }, [main, inner, paging]);
  const seen = useRef(mode);
  useLayoutEffect(() => {
    if (seen.current === mode) return;
    seen.current = mode;
    const box = main.current;
    const n = noted.current;
    if (!box || paging || n === null) return;
    const stop = settleAtTop(box, inner.current, n);
    return stop;
  }, [mode, paging, main, inner]);
}
