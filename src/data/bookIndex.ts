// src/data/bookIndex.ts — public/data/index.json held in the bundle: the books, their chapters, each chapter's verse count and fingerprint,
// for what must answer at once and offline-proof without a fetch (the Goal setting's check and its pickers, a chapter's address). The fetched
// copy is loadCanonIndex (src/data/chapter.ts); it is the same file.
// CANON_INDEX is all 66 books. BOOK_INDEX is the 27 read in Greek: until the readers move to the canon (mw-uqlxea.2) every goal, picker and
// check keeps the New Testament it always had.
import index from '../../public/data/index.json' with { type: 'json' };
import type { BookIndex } from './chapter';

/** The index of the books read in Greek: public/data/index.json lists all 66, and every reader still opens the 27 of the New Testament only. */
export const greekBooks = (all: BookIndex): BookIndex => ({ ...all, books: all.books.filter((b) => (b.lang ?? 'grc') === 'grc') });

export const CANON_INDEX: BookIndex = index as BookIndex;
export const BOOK_INDEX: BookIndex = greekBooks(CANON_INDEX);
