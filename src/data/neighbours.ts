// src/data/neighbours.ts — the chapter before and the chapter after one, across books (Romans 16 is followed by 1 Corinthians 1),
// from the book order and chapter counts in books.ts. Matthew 1 has no previous and Revelation 22 no next (mw-5r3p30.63).
import { BOOKS } from './books';
import { chapterOf, type OpenChapter } from './readerChapter';

export interface Neighbours {
  previous: OpenChapter | null;
  next: OpenChapter | null;
}

/** The chapters either side of a chapter; both null for a book or a chapter that is not there. */
export function neighbours(book: string, chapter: number): Neighbours {
  const at = BOOKS.findIndex((b) => b.code === book);
  const here = BOOKS[at];
  if (!here || !Number.isInteger(chapter) || chapter < 1 || chapter > here.chapters) return { previous: null, next: null };
  let previous: OpenChapter | null = null;
  let next: OpenChapter | null = null;
  if (chapter > 1) previous = chapterOf(book, chapter - 1) ?? null;
  else if (at > 0) previous = chapterOf(BOOKS[at - 1].code, BOOKS[at - 1].chapters) ?? null;
  if (chapter < here.chapters) next = chapterOf(book, chapter + 1) ?? null;
  else if (at < BOOKS.length - 1) next = chapterOf(BOOKS[at + 1].code, 1) ?? null;
  return { previous, next };
}
