// src/data/plans/wholeBible.ts — the whole Bible, Genesis to Revelation: every chapter of the 39 Old Testament books (data/otBooks.ts) and then the 27
// of the New (data/books.ts), in canon order, 1,189 in all.
import { BOOKS } from '../books';
import { OT_BOOKS } from '../otBooks';
import type { Plan, PlanChapter } from './plan';

const chaptersOf = (books: readonly { code: string; chapters: number }[]): PlanChapter[] =>
  books.flatMap((book) => Array.from({ length: book.chapters }, (_, i) => ({ code: book.code, chapter: i + 1 })));

export const wholeBible: Plan = {
  id: 'whole-bible',
  name: 'The whole Bible',
  chapters: () => [...chaptersOf(OT_BOOKS), ...chaptersOf(BOOKS)],
};
