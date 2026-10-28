// src/data/books.ts — the 66 books of the Bible in canon order, with the codes public/data/index.json uses (canon.ts holds the table). BOOKS is all 66; NT_BOOKS (the 27 read in Greek)
// and OT_BOOKS (the 39 read in Hebrew) are views of it. The Reader's title ('1 John 1') and the buttons at the foot of a chapter are needed before any file has loaded, so the names and the chapter
// counts are here; the picker's grid reads the counts of the New Testament from index.json through loadIndex (src/data/chapter.ts).
// tests/unit/books.test.ts holds this list equal to the index.
import { CANON, type CanonBook } from './canon';
import { CANON_INDEX } from './bookIndex';

export type Book = CanonBook;

/** All 66 books, Genesis to Revelation. */
export const BOOKS: readonly Book[] = CANON;

/** The 27 books of the New Testament, read in Greek. */
export const NT_BOOKS: readonly Book[] = BOOKS.filter((b) => b.lang === 'grc');

/** The 39 books of the Old Testament, read in Hebrew (Aramaic where the book has it). */
export const OT_BOOKS: readonly Book[] = BOOKS.filter((b) => b.lang === 'hbo');

/** The book a code names (any of the 66), or undefined for a code that is not one of them. */
export const bookOf = (code: string): Book | undefined => BOOKS.find((b) => b.code === code);

/** The book a code names when it is one of the 27 of the New Testament; undefined for the Old Testament's codes. For what still holds only the New Testament. */
export const ntBookOf = (code: string): Book | undefined => NT_BOOKS.find((b) => b.code === code);

/** The book a code names when it is one of the 39 of the Old Testament. */
export const otBookOf = (code: string): Book | undefined => OT_BOOKS.find((b) => b.code === code);

/** Whether a book is read in Hebrew: a code of the Old Testament. */
export const isHebrewBook = (code: string): boolean => otBookOf(code) !== undefined;

/** 'Romans 8', '1 John 1'. */
export const titleOf = (code: string, chapter: number): string => `${bookOf(code)?.name ?? code} ${chapter}`;

/** Whether Lampas holds the book's text: its chapters are in the data index (public/data/index.json), whatever the testament. The one check behind a reference that opens in the Reader. */
export const isHeld = (code: string): boolean => CANON_INDEX.books.some((b) => b.code === code);
