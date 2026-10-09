// src/data/neighbours.ts — the chapter before and the chapter after one, across books (Romans 16 is followed by 1 Corinthians 1),
// from the book order and chapter counts in books.ts. Matthew 1 has no previous and Revelation 22 no next (mw-5r3p30.63).
import { BOOKS } from './books';
import { BOOK_INDEX } from './bookIndex';
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

/** A place in the text: a verse of a chapter of a book. */
export interface VersePlace {
  book: string;
  chapter: number;
  verse: number;
}

export interface VerseNeighbours {
  previous: VersePlace | null;
  next: VersePlace | null;
}

const versesIn = (book: string, chapter: number): number => BOOK_INDEX.books.find((b) => b.code === book)?.verses[chapter - 1] ?? 0;

/** The verse before and the verse after one, across chapters and books (Romans 8:39 is followed by Romans 9:1), from the verse counts in
 * public/data/index.json held in the bundle (no fetch). Matthew 1:1 has no previous and Revelation 22:21 no next (mw-5r3p30.79). */
export function verseNeighbours(book: string, chapter: number, verse: number): VerseNeighbours {
  const count = versesIn(book, chapter);
  if (!Number.isInteger(verse) || verse < 1 || verse > count) return { previous: null, next: null };
  const { previous: lastChapter, next: nextChapter } = neighbours(book, chapter);
  const previous: VersePlace | null =
    verse > 1
      ? { book, chapter, verse: verse - 1 }
      : lastChapter
        ? { book: lastChapter.book, chapter: lastChapter.chapter, verse: versesIn(lastChapter.book, lastChapter.chapter) }
        : null;
  const next: VersePlace | null =
    verse < count ? { book, chapter, verse: verse + 1 } : nextChapter ? { book: nextChapter.book, chapter: nextChapter.chapter, verse: 1 } : null;
  return { previous, next };
}
