// src/reader/useKeepTopVerse.ts — the verse on top stays on top when the mode changes (mw-5r3p30.863). English, Weave and Greek (Hebrew) lay the same chapter out at different
// heights per verse, so the place he was reading is a verse, not a number of pixels: the Reader re-draws the blocks in place and the box would otherwise stay at the same offset, which
// is another verse. The verse that is first at the top of the box is noted as he scrolls (the DOM before the switch is gone when the new mode draws, and a hook has no
// before-update snapshot); when the mode changes it is brought back to the top with settleAtTop (src/reader/useBringVerse.ts), which keeps it there while the new mode's late layout
// (fonts, pictures) settles. Turn pages keeps its own anchor (src/reader/usePages.ts) and is left alone.
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { settleAtTop } from './useBringVerse';

/** The first verse whose top is at or below the top of `box`, a verse that began above it (cut mid-verse at the top) not counted; null where the box is at its own top or shows no verse. */
export function topVerseOf(box: HTMLElement): number | null {
  // at the chapter's top the heading and the first lines stay in view: nothing to keep
  if (box.scrollTop <= 0) return null;
  const top = box.getBoundingClientRect().top;
  for (const el of box.querySelectorAll<HTMLElement>('[data-verse]')) {
    if (el.getBoundingClientRect().top >= top - 1) {
      const n = Number(el.dataset.verse);
      return Number.isInteger(n) ? n : null;
    }
  }
  return null;
}

/** Keeps the verse on top of `main` on top as `mode` (a string that changes when the view, the weave, its order or the plain English under it does) changes; `mode` is null until the
 * Reader's settings are read. */
export function useKeepTopVerse(main: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, mode: string | null, paging: boolean): void {
  const verse = useRef<number | null>(null);
  const was = useRef(mode);
  useEffect(() => {
    const box = main.current;
    if (!box || paging) return;
    const note = () => {
      verse.current = topVerseOf(box);
    };
    box.addEventListener('scroll', note, { passive: true });
    return () => box.removeEventListener('scroll', note);
  }, [main, paging]);
  useLayoutEffect(() => {
    const before = was.current;
    was.current = mode;
    const box = main.current;
    if (before === null || mode === null || before === mode || !box || paging || verse.current === null) return;
    return settleAtTop(box, inner.current, verse.current);
  }, [main, inner, mode, paging]);
}
