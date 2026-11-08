// src/data/lxxChapter.ts — the Septuagint's chapters (mw-u2w5klk.11, the Septuagint epic's R3; docs/data.md 'The Septuagint data'): public/data-lxx/index.json says which Old Testament books are
// shipped and, for each Greek chapter, the chapter(s) of Lampas's own Old Testament its verses are in; a shipped book's chapter is public/data-lxx/<code>/<n>.json, the Greek chapter's number,
// which is not always Lampas's (Greek Ps 22 is Psalm 23). loadChapter (src/data/chapter.ts) opens them for an Old Testament book while Settings > Old Testament in Greek is On.
import { within } from './within';
import type { BookInfo, Chapter, GreekWord, LexEntry, Verse } from './chapter';
import type { LemmaLexicon } from './lexicon';

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

/**
 * A word with Swete's lacuna brackets taken out ('συνετε]λέσθησαν' -> 'συνετελέσθησαν', mw-u2w5klk.280). Swete prints Codex Alexandrinus for Genesis and brackets the letters lost from its damaged
 * leaves; the brackets sit inside a word's `t` in public/data-lxx. loadSeptuagintChapter keeps `t` bare with this and the printed form in `d`.
 */
export const withoutGaps = (text: string): string => text.replace(/[[\]]/g, '');

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

type LxxLexiconFile = Record<string, LexEntry & { s?: string }>;
let lexiconFile: Promise<LxxLexiconFile> | null = null;
let lexicon: Promise<Record<string, LexEntry>> | null = null;
let lemmas: Promise<LemmaLexicon> | null = null;

/** Fetches /data-lxx/lexicon-grc-lxx.json once, as the file has it. A failure is not kept. */
function loadLxxLexiconFile(): Promise<LxxLexiconFile> {
  if (lexiconFile) return lexiconFile;
  const request = within(async (signal) => {
    const response = await fetch('/data-lxx/lexicon-grc-lxx.json', { signal });
    if (!response.ok) throw new Error(`Could not load the Septuagint lexicon: ${response.status}`);
    return (await response.json()) as LxxLexiconFile;
  });
  lexiconFile = request;
  request.catch(() => {
    if (lexiconFile === request) lexiconFile = null;
  });
  return request;
}

/**
 * Fetches /data-lxx/lexicon-grc-lxx.json once: every lemma of the shipped books -> TBESG's gloss and definition (and its Strong's number, which a word of this text does not show: it has none of its own).
 * A lexicon that cannot be fetched is `{}`, not a failure: the word's card then has no Meaning, and the next chapter asks again.
 */
export function loadLxxLexicon(): Promise<Record<string, LexEntry>> {
  lexicon ??= loadLxxLexiconFile().then((all) => Object.fromEntries(Object.entries(all).map(([lemma, { g, d }]) => [lemma, { g, d }])));
  const held = lexicon;
  held.catch(() => {
    if (lexicon === held) lexicon = null;
  });
  return held.catch(() => ({}));
}

/**
 * The same lexicon as the word-by-lemma paths read the New Testament's (src/data/lexicon.ts LemmaLexicon): every lemma of the shipped books -> gloss, Strong's number and, which the file lacks, no part of speech ('').
 * One object for as long as the page lives, so findWord's index (src/nav/links.ts) is built once. A lexicon that cannot be fetched is `{}`.
 */
export function loadLxxLemmas(): Promise<LemmaLexicon> {
  lemmas ??= loadLxxLexiconFile().then((all) => Object.fromEntries(Object.entries(all).map(([lemma, { g, s }]) => [lemma, { g, s: s ?? '', c: '' }])));
  const held = lemmas;
  held.catch(() => {
    if (lemmas === held) lemmas = null;
  });
  return held.catch(() => ({}));
}

/** Forgets the index and the lexicon held in memory (tests). */
export const forgetLxxIndex = (): void => {
  index = null;
  lexiconFile = null;
  lexicon = null;
  lemmas = null;
};

/**
 * Every Greek chapter that holds verses of Lampas's chapter `n` of the Old Testament book `book`, ascending, with the address of its file's fingerprint; empty when the Septuagint of the book is not shipped (the book is
 * not in the index, or the index names no Greek chapter for it). Psalm 116 is Greek Psalms 114 and 115; Psalms 9 and 10 are both in Greek 9.
 */
export function greekChaptersOf(from: LxxIndex, book: string, n: number): GreekChapter[] {
  const shipped = from.books.find((b) => b.lampas === book);
  if (!shipped) return [];
  return shipped.lampasChapters.flatMap((chapters, at) => (chapters.includes(n) ? [{ code: shipped.code, chapter: at + 1, fingerprint: shipped.fingerprints[at] ?? '' }] : []));
}

/** The first Greek chapter that holds a Lampas chapter (see greekChaptersOf), or null when the Septuagint of the book is not shipped. */
export function greekChapterOf(from: LxxIndex, book: string, n: number): GreekChapter | null {
  return greekChaptersOf(from, book, n)[0] ?? null;
}

/**
 * What the Reader's notice says when an Old Testament chapter is the Hebrew while the Septuagint is On (mw-u2w5klk.18). 'Not ready yet' is true only when the index was reached (`from`) and the book, or this chapter of it, is
 * not in it. An index that could not be reached is told as it is: the phone is offline (on the browser's word, as the Reader's other fetch notices say it), or it could not be fetched. `name` is the book's name as the Reader writes it.
 */
export function notReadyNotice(from: LxxIndex | null, online: boolean, book: string, n: number, name: string): string {
  if (from) return `The Septuagint of ${notReadyName(from, book, n, name)} is not ready yet; this is the Hebrew.`;
  return online ? 'The Septuagint could not be fetched; this is the Hebrew.' : 'You are offline, and a Septuagint chapter needs the network; this is the Hebrew.';
}

/**
 * What a "not ready" notice names (mw-u2w5klk.298): the book alone (`Genesis`) when the Septuagint of the book is not shipped, or the index could not be read; the chapter (`Genesis 14`) when the book is shipped and this
 * chapter is the one held back. `name` is the book's name as the Reader writes it.
 */
export const notReadyName = (from: LxxIndex | null, book: string, n: number, name: string): string => (from?.books.some((b) => b.lampas === book) ? `${name} ${n}` : name);

/** The address of a Greek chapter's file: /data-lxx/<code>/<n>.json?v=<fingerprint>, plain when the index has no fingerprint for it. */
export const lxxChapterUrl = (at: GreekChapter): string => `/data-lxx/${at.code}/${at.chapter}.json${at.fingerprint ? `?v=${at.fingerprint}` : ''}`;

/** Whether verse `verse` of a Greek chapter belongs to Lampas's chapter `n` of `book`: one of the Lampas verses it answers is in that chapter (a verse with no `ref` at all is the file's, so it stays). A verse Lampas has no verse
 * for ('none': an Addition, a Psalm's extra title) belongs to the first Lampas chapter its file serves (`owner`). */
function belongsTo(verse: Verse, book: string, n: number, owner: boolean): boolean {
  if (verse.ref === undefined) return true;
  if (verse.ref === 'none') return owner;
  return [verse.ref, ...(verse.refs ?? [])].some((r) => r.book === book && r.chapter === n);
}

/** The Lampas verse a verse of Lampas's chapter `n` answers (the first, in that chapter), or null for one with none. */
const lampasVerseIn = (verse: Verse, book: string, n: number): number | null => {
  if (verse.ref === undefined || verse.ref === 'none') return null;
  return [verse.ref, ...(verse.refs ?? [])].find((r) => r.book === book && r.chapter === n)?.verse ?? null;
};

/**
 * The Septuagint chapter for Lampas's chapter `n` of `book`: null when the book is not shipped (the caller reads the Hebrew), a failure when a chapter's file cannot be fetched.
 * A Greek file can hold the verses of two Lampas chapters (Psalms 9 and 10 are Greek 9): the chapter keeps only the verses that answer a verse of its own chapter, so no chapter is shown whole under two titles. And a Lampas
 * chapter can be in two Greek files (Psalm 116 is Greek 114 and 115): both are fetched and their verses joined, every verse numbered as Lampas numbers it (the Greek verse numbers would collide) with its Greek chapter and verse
 * kept in `greek`; a Greek verse Lampas has no verse for has no place in such a chapter and is left out of it. The chapter's own number is the first Greek chapter's.
 */
export async function loadSeptuagintChapter(book: string, n: number): Promise<Chapter | null> {
  // an index that cannot be fetched (the folder is not there) means nothing is shipped
  const from = await loadLxxIndex().catch(() => null);
  const ats = from ? greekChaptersOf(from, book, n) : [];
  if (!from || ats.length === 0) return null;
  const [files, all] = await Promise.all([
    Promise.all(
      ats.map((at) =>
        within(async (signal) => {
          const response = await fetch(lxxChapterUrl(at), { signal });
          if (!response.ok) throw new Error(`Could not load ${at.code}/${at.chapter} of the Septuagint: ${response.status}`);
          return (await response.json()) as Chapter;
        }),
      ),
    ),
    loadLxxLexicon(),
  ]);
  const shipped = from.books.find((b) => b.lampas === book);
  const joined = files.length > 1;
  const ownVerses = files.map((file, i) => {
    const owner = shipped?.lampasChapters[ats[i].chapter - 1]?.[0] === n;
    const mine = file.verses.filter((v) => belongsTo(v, book, n, owner));
    // a file none of whose verses answers this chapter is the index and the file disagreeing: show the file, as before, rather than an empty chapter
    return mine.length > 0 || joined ? mine : file.verses;
  });
  const verses: Verse[] = joined
    ? ownVerses
        .flatMap((mine, i) => mine.flatMap((v) => (lampasVerseIn(v, book, n) === null ? [] : [{ ...v, n: lampasVerseIn(v, book, n)!, greek: { chapter: ats[i].chapter, verse: v.n } }])))
        .sort((a, b) => a.n - b.n)
    : ownVerses[0];
  const chapter: Chapter = joined ? { ...files[0], parse: Object.assign({}, ...files.map((f) => f.parse)) as Chapter['parse'] } : files[0];
  // the code is Lampas's own for the book (`sng`, where Swete's file is `sol`); `chapter` stays the Greek number, which the Reader's title names beside Lampas's.
  // The words have no Strong's number: the chapter's `lex` is the lexicon's entry for each lemma the chapter uses, keyed by the lemma (wordGloss, wordDefinition).
  const lex: Record<string, LexEntry> = {};
  for (const verse of verses) for (const word of verse.g) if (Object.hasOwn(all, word.l)) lex[word.l] = all[word.l];
  // Swete's lacuna brackets are inside a word's `t` ('συνετε]λέσθησαν'): `t` is made bare so lookup, speech, copy and search never see one, and the printed form stays in `d` for the Greek view to draw when asked
  // (mw-u2w5klk.280). The file is not changed.
  const bare = (word: GreekWord): GreekWord => (withoutGaps(word.t) === word.t ? word : { ...word, t: withoutGaps(word.t), d: word.t });
  return { ...chapter, code: book, lex, verses: verses.map((verse) => (verse.g.some((w) => withoutGaps(w.t) !== w.t) ? { ...verse, g: verse.g.map(bare) } : verse)) };
}
