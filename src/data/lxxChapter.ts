// src/data/lxxChapter.ts — the Septuagint's chapters (mw-u2w5klk.11, the Septuagint epic's R3; docs/data.md 'The Septuagint data'): public/data-lxx/index.json says which Old Testament books are
// shipped and, for each Greek chapter, the chapter(s) of Lampas's own Old Testament its verses are in; a shipped book's chapter is public/data-lxx/<code>/<n>.json, the Greek chapter's number,
// which is not always Lampas's (Greek Ps 22 is Psalm 23). loadChapter (src/data/chapter.ts) opens them for an Old Testament book while Settings > Old Testament in Greek is On.
import { within } from './within';
import type { BookInfo, Chapter, LexEntry } from './chapter';

/** One book of public/data-lxx/index.json: a BookInfo of Swete's own book (`code` is Swete's, lower case) with the Lampas book it is and the Lampas chapters of each Greek chapter. */
export interface LxxBook extends BookInfo {
  /** the code of the book in Lampas's own Old Testament (`sng` for Swete's `sol`); absent for a book Lampas has none of */
  lampas?: string;
  /** per Greek chapter, the chapter(s) of Lampas's Old Testament its verses are in, ascending; empty where none is */
  lampasChapters: number[][];
}

export interface LxxIndex {
  sources: Record<string, string>;
  books: LxxBook[];
}

/** The Greek chapter that holds a Lampas chapter, with the address of its file's fingerprint. */
export interface GreekChapter {
  /** Swete's book code, the folder of public/data-lxx */
  code: string;
  /** the Greek chapter's number */
  chapter: number;
  /** the fingerprint of its file; '' when the index has none */
  fingerprint: string;
}

let index: Promise<LxxIndex> | null = null;

/** Fetches /data-lxx/index.json once. A failure is not kept. */
export function loadLxxIndex(): Promise<LxxIndex> {
  if (index) return index;
  const request = within(async (signal) => {
    const response = await fetch('/data-lxx/index.json', { signal });
    if (!response.ok) throw new Error(`Could not load the Septuagint index: ${response.status}`);
    return (await response.json()) as LxxIndex;
  });
  index = request;
  request.catch(() => {
    if (index === request) index = null;
  });
  return request;
}

let lexicon: Promise<Record<string, LexEntry>> | null = null;

/**
 * Fetches /data-lxx/lexicon-grc-lxx.json once: every lemma of the shipped books -> TBESG's gloss and definition (and its Strong's number, which a word of this text does not show: it has none of its own).
 * A lexicon that cannot be fetched is `{}`, not a failure: the word's card then has no Meaning, and the next chapter asks again.
 */
export function loadLxxLexicon(): Promise<Record<string, LexEntry>> {
  if (lexicon) return lexicon;
  const request = within(async (signal) => {
    const response = await fetch('/data-lxx/lexicon-grc-lxx.json', { signal });
    if (!response.ok) throw new Error(`Could not load the Septuagint lexicon: ${response.status}`);
    return (await response.json()) as Record<string, LexEntry & { s?: string }>;
  }).then((all) => Object.fromEntries(Object.entries(all).map(([lemma, { g, d }]) => [lemma, { g, d }])));
  lexicon = request;
  request.catch(() => {
    if (lexicon === request) lexicon = null;
  });
  return request.catch(() => ({}));
}

/** Forgets the index and the lexicon held in memory (tests). */
export const forgetLxxIndex = (): void => {
  index = null;
  lexicon = null;
};

/**
 * The Greek chapter that holds Lampas's chapter `n` of the Old Testament book `book`, or null when the Septuagint of the book is not shipped (the book is not in the index, or the index
 * names no Greek chapter for it). Where the verses of a Lampas chapter are in more than one Greek chapter (Psalm 116 is Greek Psalms 114 and 115) it is the first.
 */
export function greekChapterOf(from: LxxIndex, book: string, n: number): GreekChapter | null {
  const shipped = from.books.find((b) => b.lampas === book);
  if (!shipped) return null;
  const at = shipped.lampasChapters.findIndex((chapters) => chapters.includes(n));
  return at < 0 ? null : { code: shipped.code, chapter: at + 1, fingerprint: shipped.fingerprints[at] ?? '' };
}

/** The address of a Greek chapter's file: /data-lxx/<code>/<n>.json?v=<fingerprint>, plain when the index has no fingerprint for it. */
export const lxxChapterUrl = (at: GreekChapter): string => `/data-lxx/${at.code}/${at.chapter}.json${at.fingerprint ? `?v=${at.fingerprint}` : ''}`;

/** The Septuagint chapter for Lampas's chapter `n` of `book`: null when the book is not shipped (the caller reads the Hebrew), a failure when the chapter's file cannot be fetched. */
export async function loadSeptuagintChapter(book: string, n: number): Promise<Chapter | null> {
  // an index that cannot be fetched (the folder is not there) means nothing is shipped
  const from = await loadLxxIndex().catch(() => null);
  const at = from ? greekChapterOf(from, book, n) : null;
  if (!at) return null;
  const [chapter, all] = await Promise.all([
    within(async (signal) => {
      const response = await fetch(lxxChapterUrl(at), { signal });
      if (!response.ok) throw new Error(`Could not load ${at.code}/${at.chapter} of the Septuagint: ${response.status}`);
      return (await response.json()) as Chapter;
    }),
    loadLxxLexicon(),
  ]);
  // the code is Lampas's own for the book (`sng`, where Swete's file is `sol`); `chapter` stays the Greek number, which the Reader's title names beside Lampas's.
  // The words have no Strong's number: the chapter's `lex` is the lexicon's entry for each lemma the chapter uses, keyed by the lemma (wordGloss, wordDefinition).
  const lex: Record<string, LexEntry> = {};
  for (const verse of chapter.verses) for (const word of verse.g) if (Object.hasOwn(all, word.l)) lex[word.l] = all[word.l];
  return { ...chapter, code: book, lex };
}
