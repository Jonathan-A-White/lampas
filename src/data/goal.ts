// src/data/goal.ts — a reading goal (mw-hqd5bz.2): 'Read 1 John', 'Read 1 John 1' or 'Read 1 John 1:1'. A goal names a book and, when it
// is smaller than the book, a chapter and then a verse. parseGoal reads what he typed against the index (so a chapter or a verse
// the text lacks is refused); the book list is src/data/books.ts, not a second one.
import { bookOf, BOOKS } from './books';
import type { BookIndex } from './chapter';

export interface Goal {
  /** the book's code as public/data/index.json has it: 'rom', '1jn' */
  book: string;
  chapter?: number;
  /** only with a chapter */
  verse?: number;
}

const squash = (text: string): string => text.replace(/\s+/g, '').toLowerCase();

// 'Read' (optional), the book, then a chapter and a verse. The book is taken lazily, so '1 John 1' ends its name before the 1.
const GOAL = /^(?:read\s+)?(.+?)(?:\s+(\d+)(?:\s*:\s*(\d+))?)?$/i;

/** The goal text names, or undefined when it names no book, or a chapter or verse the index does not have. */
export function parseGoal(text: string, index: BookIndex): Goal | undefined {
  const match = GOAL.exec(text.normalize('NFC').trim());
  if (!match) return undefined;
  const [, name, chapterText, verseText] = match;
  const key = squash(name);
  const book = BOOKS.find((b) => b.code === key || squash(b.name) === key);
  const info = book && index.books.find((b) => b.code === book.code);
  if (!book || !info) return undefined;
  if (chapterText === undefined) return { book: book.code };
  const chapter = Number(chapterText);
  if (chapter < 1 || chapter > info.chapters) return undefined;
  if (verseText === undefined) return { book: book.code, chapter };
  const verse = Number(verseText);
  if (verse < 1 || verse > (info.verses[chapter - 1] ?? 0)) return undefined;
  return { book: book.code, chapter, verse };
}

const place = (goal: Goal, name: string): string => {
  if (goal.chapter === undefined) return name;
  return goal.verse === undefined ? `${name} ${goal.chapter}` : `${name} ${goal.chapter}:${goal.verse}`;
};

/** The canonical text of a goal, '1 John 1:1': what is saved, and what parseGoal reads back to the same goal. */
export const goalText = (goal: Goal): string => place(goal, bookOf(goal.book)?.name ?? goal.book);

/** What the goal is called on a screen: 'Read 1 John 1:1'. */
export const goalTitle = (goal: Goal, index: BookIndex): string => `Read ${place(goal, index.books.find((b) => b.code === goal.book)?.name ?? goalText({ book: goal.book }))}`;
