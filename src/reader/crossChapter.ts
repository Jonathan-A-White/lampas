// src/reader/crossChapter.ts — Turn pages past a chapter's edge (mw-5r3p30.620): the page after the last opens the next chapter on its first page, and the page
// before the first opens the previous chapter on its LAST page, across books, through openReader, the place the chapter buttons and the chapter swipe open
// a chapter by. The page the target chapter shows is set first (src/nav/scrollMemory.ts keepPage): a chapter read in pages before would otherwise open on the
// page he left it on, and a page past its end shows the last (the Reader cuts the pages, so how many there are is not known here).
import { neighbours } from '../data/neighbours';
import { keepPage } from '../nav/scrollMemory';
import { openReader, readerOf } from '../nav/route';

/** Stands for "the last page": a kept page past the end shows the last. */
const LAST_PAGE = Number.MAX_SAFE_INTEGER;

/** Opens the chapter after (1) or before (-1) `book` `chapter`, on its first page or its last; nothing at Matthew 1 going back or Revelation 22 going on.
 * True when it opens one (the page turn draws the turn into it, src/reader/usePages.ts). */
export function crossChapter(book: string, chapter: number, by: 1 | -1): boolean {
  const { previous, next } = neighbours(book, chapter);
  const to = by > 0 ? next : previous;
  if (!to) return false;
  // a second tap before the first has taken effect opens no second step
  const now = readerOf(window.location.hash);
  if ((now.book ?? 'rom') === to.book && now.chapter === to.chapter) return false;
  keepPage(`${to.book}/${to.chapter}`, { page: by > 0 ? 0 : LAST_PAGE, count: 1, verse: null });
  openReader({ book: to.book, chapter: to.chapter });
  return true;
}

/** True when there is a chapter after (1) or before (-1) `book` `chapter` to turn into. */
export const canCross = (book: string, chapter: number, by: 1 | -1): boolean => {
  const { previous, next } = neighbours(book, chapter);
  return (by > 0 ? next : previous) !== null;
};
