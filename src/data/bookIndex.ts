// src/data/bookIndex.ts — public/data/index.json held in the bundle (2 KB): the books, their chapters and each chapter's verse count,
// for what must answer at once and offline-proof without a fetch (the Goal setting's check and its pickers). The fetched copy is
// loadIndex (src/data/chapter.ts); it is the same file.
import index from '../../public/data/index.json';
import type { BookIndex } from './chapter';

export const BOOK_INDEX: BookIndex = index;
