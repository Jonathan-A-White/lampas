// src/reader/lastPlace.ts — a chapter opens at the verse he was last on in it (mw-5r3p30.1148). The verse on top is noted as he scrolls (topVerseOf, src/reader/useKeepTopVerse.ts) in the
// last-place store (src/data/readerChapter.ts setLastVerse, which extends mw-5r3p30.1146's chapter per book), and a chapter he has read before comes back to it with settleAtTop
// (src/reader/useBringVerse.ts), as a verse he asked for does. It gives way to a place that names a verse (a typed 'John 18:36', a link, a search hit, a cross-reference, a verse in the
// address) and to a scroll offset the app already kept for the address (src/nav/scrollMemory.ts), which puts him back at the same pixel. Turn pages keeps its own page and is left alone.
import { useEffect, type RefObject } from 'react';
import type { Chapter } from '../data/chapter';
import { getLastVerse, setLastVerse } from '../data/readerChapter';
import { settleAtTop } from './useBringVerse';
import { topVerseOf } from './useKeepTopVerse';

/** How long the box is watched for the remembered verse to be drawn before it is given up (a verse the chapter no longer has). */
const WAIT_MS = 3000;

/** Notes the verse on top of `main` as he scrolls, for this chapter. */
export function useNoteLastVerse(main: RefObject<HTMLElement | null>, book: string, chapter: number, paging: boolean): void {
  useEffect(() => {
    const box = main.current;
    if (!box || paging) return;
    const note = () => setLastVerse(book, chapter, topVerseOf(box));
    box.addEventListener('scroll', note, { passive: true });
    return () => box.removeEventListener('scroll', note);
  }, [main, book, chapter, paging]);
}

/** Brings the verse he was last on in this chapter to the top of `main` once, when the chapter is on screen and `skip` (a place already named, or a kept offset) does not apply; says which
 * on the box (data-restored-verse, for a test). */
export function useBringLastVerse(main: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, book: string, chapterN: number, chapter: Chapter | null, paging: boolean, skip: boolean): void {
  useEffect(() => {
    const box = main.current;
    if (!box || skip || paging || !chapter || chapter.code !== book || chapter.chapter !== chapterN) return;
    const verse = getLastVerse(book, chapterN);
    if (verse === undefined) return;
    let watcher: MutationObserver | undefined;
    let stop: (() => void) | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const start = (): boolean => {
      if (!box.querySelector(`[data-verse="${verse}"]`)) return false;
      watcher?.disconnect();
      clearTimeout(giveUp);
      // his own hand has already moved the box: where he put it stays
      if (box.scrollTop > 0) return true;
      box.setAttribute('data-restored-verse', String(verse));
      stop = settleAtTop(box, inner.current, verse);
      return true;
    };
    if (!start()) {
      watcher = new MutationObserver(start);
      watcher.observe(box, { childList: true, subtree: true });
      giveUp = setTimeout(() => watcher?.disconnect(), WAIT_MS);
    }
    return () => {
      watcher?.disconnect();
      clearTimeout(giveUp);
      stop?.();
      box.removeAttribute('data-restored-verse');
    };
  }, [main, inner, book, chapterN, chapter, paging, skip]);
}
