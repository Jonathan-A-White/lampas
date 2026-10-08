// src/data/readerChapter.ts — the chapter the Reader has open, and so the one Quick test, the Parsing drill and Review draw their forms from
// (mw-5r3p30.60). A fresh install opens Romans 8. The Reader sets it whenever it shows a chapter; it is kept in localStorage
// (lampas.chapter), not Dexie, because the screens read it synchronously before they render. Words, their review rows and
// results are not per chapter, so moving to another chapter takes none of them away.
import { bookOf, titleOf } from './books';

export interface OpenChapter {
  /** the book's code as public/data/index.json has it: 'rom', '1jn' */
  book: string;
  chapter: number;
  /** 'Romans 8' */
  title: string;
}

const KEY = 'lampas.chapter';

/** What a fresh install opens, and what a stored value that cannot be read falls back to. */
export const DEFAULT_CHAPTER: OpenChapter = { book: 'rom', chapter: 8, title: 'Romans 8' };

/** The open chapter for a book and a chapter number, or undefined when the book is not one of the 27 or the number is not a chapter. */
export function chapterOf(book: string, chapter: number): OpenChapter | undefined {
  if (!bookOf(book) || !Number.isInteger(chapter) || chapter < 1 || chapter > 150) return undefined;
  return { book, chapter, title: titleOf(book, chapter) };
}

function store(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The chapter he last had open, or Romans 8. */
export function getOpenChapter(): OpenChapter {
  try {
    const saved = JSON.parse(store()?.getItem(KEY) ?? 'null') as { book?: unknown; chapter?: unknown } | null;
    if (saved && typeof saved.book === 'string' && typeof saved.chapter === 'number') {
      return chapterOf(saved.book, saved.chapter) ?? DEFAULT_CHAPTER;
    }
  } catch {
    // unreadable: Romans 8
  }
  return DEFAULT_CHAPTER;
}

/** Keeps this as the chapter he has open. */
export function setOpenChapter(book: string, chapter: number): void {
  try {
    store()?.setItem(KEY, JSON.stringify({ book, chapter }));
  } catch {
    // Storage full or refused: the next open is Romans 8, or the chapter in the address.
  }
}
