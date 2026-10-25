// src/data/books.ts — the 27 books of the New Testament in canonical order, with the codes public/data/index.json uses (the canon's 'grc' books, canon.ts; the readers move to the canon of 66 in mw-uqlxea.2). The Reader's
// title ('1 John 1') and the buttons at the foot of a chapter are needed before any file has loaded, so the names and the chapter
// counts are here; the picker's grid reads the counts from index.json through loadIndex (src/data/chapter.ts).
// tests/unit/books.test.ts holds this list equal to the index.
import { CANON } from './canon';

export interface Book {
  code: string;
  name: string;
  /** how many chapters the book has */
  chapters: number;
}

export const BOOKS: readonly Book[] = CANON.filter((b) => b.lang === 'grc').map(({ code, name, chapters }) => ({ code, name, chapters }));

/** The book a code names, or undefined for a code that is not one of the 27. */
export const bookOf = (code: string): Book | undefined => BOOKS.find((b) => b.code === code);

/** 'Romans 8', '1 John 1'. */
export const titleOf = (code: string, chapter: number): string => `${bookOf(code)?.name ?? code} ${chapter}`;
