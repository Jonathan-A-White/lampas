// src/data/plans/wholeBible.ts — the whole Bible, Genesis to Revelation: every chapter of the 66 books (data/books.ts), the 39 of the Old Testament and then the 27
// of the New, in canon order, 1,189 in all.
import { BOOKS } from '../books';
import type { Plan, PlanChapter } from './plan';

const chaptersOf = (books: readonly { code: string; chapters: number }[]): PlanChapter[] =>
  books.flatMap((book) => Array.from({ length: book.chapters }, (_, i) => ({ code: book.code, chapter: i + 1 })));

export const wholeBible: Plan = {
  id: 'whole-bible',
  name: 'The whole Bible',
  chapters: () => chaptersOf(BOOKS),
};
