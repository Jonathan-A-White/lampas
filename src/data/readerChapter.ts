// src/data/readerChapter.ts — the chapter the Reader has open, and so the one Quick test, the Parsing drill and Review draw their forms from
// (mw-5r3p30.60). A fresh install opens Romans 8. The Reader sets it whenever it shows a chapter; it is kept in localStorage
// (lampas.chapter), not Dexie, because the screens read it synchronously before they render. Words, their review rows and
// results are not per chapter, so moving to another chapter takes none of them away.
import { bookOf, isHebrewBook, titleOf } from './books';
import type { SourceLanguage } from './chapter';

export interface OpenChapter {
  /** the book's code as public/data/index.json has it: 'rom', '1jn' */
  book: string;
  chapter: number;
  /** 'Romans 8' */
  title: string;
}

const KEY = 'lampas.chapter';
/** The last chapter the Reader had open that is read in Greek (mw-uqlxea.3): where the ladders, the quizzes and Review draw their forms from. */
const STUDY_KEY = 'lampas.studyChapter';
/** The last chapter the Reader had open that is read in Hebrew (mw-gdcyf98.19): where the Hebrew words of the quizzes and Review draw their forms from. */
const HEBREW_STUDY_KEY = 'lampas.studyChapterHebrew';

/** The Old Testament chapter the Reader has open and is showing as Greek (Settings > Old Testament in Greek (Septuagint) On, the book shipped): a chapter's file is the only thing that knows, and the screens read the study chapter before they render. */
const GREEK_OPEN_KEY = 'lampas.openReadAsGreek';

/** Where the Hebrew words' forms come from before he has opened any Old Testament chapter. */
export const DEFAULT_HEBREW_CHAPTER: OpenChapter = { book: 'gen', chapter: 1, title: 'Genesis 1' };

/** What a fresh install opens, and what a stored value that cannot be read falls back to. */
export const DEFAULT_CHAPTER: OpenChapter = { book: 'rom', chapter: 8, title: 'Romans 8' };

/** The open chapter for a book and a chapter number, or undefined when the book is not one of the 66 or the number is not a chapter. */
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

function read(key: string): OpenChapter | undefined {
  try {
    const saved = JSON.parse(store()?.getItem(key) ?? 'null') as { book?: unknown; chapter?: unknown } | null;
    if (saved && typeof saved.book === 'string' && typeof saved.chapter === 'number') return chapterOf(saved.book, saved.chapter);
  } catch {
    // unreadable
  }
  return undefined;
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

/** The chapter the ladders, the quizzes and Review draw their forms from: the one the Reader has open, or, while that is an Old Testament chapter (read in English, with no Greek forms to
 *  draw), the last chapter of the New Testament it had open, or Romans 8. For 'hbo' (the Hebrew words), the open chapter while it is an Old Testament one, else the last Old Testament chapter it
 *  had open, or Genesis 1. */
export function getStudyChapter(lang: SourceLanguage = 'grc'): OpenChapter {
  const open = getOpenChapter();
  if (lang === 'hbo') return isHebrewBook(open.book) ? open : (read(HEBREW_STUDY_KEY) ?? DEFAULT_HEBREW_CHAPTER);
  // an Old Testament chapter the Reader shows as the Septuagint's Greek is a Greek chapter to study (mw-u2w5klk.15)
  if (!isHebrewBook(open.book)) return open;
  const greek = read(GREEK_OPEN_KEY);
  return greek && greek.book === open.book && greek.chapter === open.chapter ? open : (read(STUDY_KEY) ?? DEFAULT_CHAPTER);
}

/**
 * Keeps what the Reader found the open chapter's words to be, once its file is here: an Old Testament chapter in 'grc' is the Septuagint's (getStudyChapter then offers it to the Greek tools), in 'hbo' the Hebrew.
 * Called for the chapter that is open; a chapter opened after it takes the note away (setOpenChapter).
 */
export function setOpenReadLanguage(book: string, chapter: number, lang: SourceLanguage): void {
  try {
    if (isHebrewBook(book) && lang === 'grc') store()?.setItem(GREEK_OPEN_KEY, JSON.stringify({ book, chapter }));
    else store()?.removeItem(GREEK_OPEN_KEY);
  } catch {
    // Storage refused: the Greek tools take the last New Testament chapter, as they did
  }
}

/** Keeps this as the chapter he has open. */
export function setOpenChapter(book: string, chapter: number): void {
  try {
    store()?.setItem(KEY, JSON.stringify({ book, chapter }));
    store()?.removeItem(GREEK_OPEN_KEY);
    store()?.setItem(isHebrewBook(book) ? HEBREW_STUDY_KEY : STUDY_KEY, JSON.stringify({ book, chapter }));
  } catch {
    // Storage full or refused: the next open is Romans 8, or the chapter in the address.
  }
}
