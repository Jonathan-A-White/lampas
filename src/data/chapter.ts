// One chapter of the Greek New Testament as public/data/<book>/<chapter>.json holds it (docs/data.md).
// Screens read a chapter through loadChapter and the word helpers below, never through the short keys.

import { BOOK_INDEX } from './bookIndex';

export interface GreekWord {
  /** the word as the Byzantine text has it */
  t: string;
  /** transliteration */
  tr: string;
  /** Strong's number, no padding: 'G686' */
  s: string;
  /** lemma, NFC */
  l: string;
  /** RP parsing code: 'V-PAP-DPM' */
  p: string;
  /** position in this verse's `e` array of the English chunk this word is part of; absent: no English */
  e?: number;
}

export interface EnglishChunk {
  /** the MSB words with their punctuation, supplied-word brackets removed */
  t: string;
  /** positions in this verse's `g` array of the Greek words it renders (1 or more) */
  g: number[];
  /**
   * Which words of the chunk the translators supplied (they are in [square brackets] in the MSB): the positions among
   * `t` split on white space, so 'was king' with `s: [0]` has 'was' supplied and 'king' not. Absent when none is. A chapter kept on a
   * phone from before mw-5r3p30.102 says `s: 1`, the whole chunk; englishRuns reads that too.
   */
  s?: number[];
}

/** A run of a chunk's words that are all supplied, or all not. */
export interface EnglishRun {
  text: string;
  supplied: boolean;
}

/** The chunk cut into runs of supplied and of other words, in order: 'was king' with `s: [0]` is 'was' (supplied), 'king'. */
export function englishRuns(chunk: EnglishChunk): EnglishRun[] {
  // The old shape (`s: 1`, or any value that is not a list) means the whole chunk is supplied; it must never throw.
  const all = !Array.isArray(chunk.s) && Boolean(chunk.s);
  const marked = new Set(Array.isArray(chunk.s) ? chunk.s : []);
  const runs: EnglishRun[] = [];
  chunk.t.split(/\s+/).filter(Boolean).forEach((word, i) => {
    const supplied = all || marked.has(i);
    const last = runs[runs.length - 1];
    if (last && last.supplied === supplied) last.text += ` ${word}`;
    else runs.push({ text: word, supplied });
  });
  return runs;
}

/** Words a translator may supply in front of a noun without them being a neighbour's: 'the beginning' stays whole. */
const ARTICLES = new Set(['the', 'a', 'an']);

/**
 * What a chunk that renders ONE Greek word says of that word (mw-5r3p30.360). The MSB aligns the words it supplies to the Greek word beside them,
 * so the chunk of ἐψηλάφησαν is 'touched [with]' (the 'with' is for 'our hands') and the chunk of περί is '[this is]' (nothing of its own): the
 * supplied words at either edge are dropped, except an article in front ('[the] beginning'); a chunk with no word of its own left gives ''.
 * Supplied words in the middle stay. The old shape (`s: 1`, no word named) is not trimmed.
 */
export function ownEnglish(chunk: EnglishChunk): string {
  const words = englishRuns(Array.isArray(chunk.s) ? chunk : { ...chunk, s: undefined })
    .flatMap((run) => run.text.split(' ').map((text) => ({ text, supplied: run.supplied })))
    // a mark on its own ('—', ',') is no word: it is not a word of the chunk's, so it neither keeps nor ends a supplied word
    .filter((w) => /[\p{L}\p{N}]/u.test(w.text));
  let end = words.length;
  while (end > 0 && words[end - 1].supplied) end--;
  let start = 0;
  while (start < end && words[start].supplied && !(ARTICLES.has(words[start].text.toLowerCase()) && words.slice(start, end).some((w) => !w.supplied))) start++;
  return words.slice(start, end).map((w) => w.text).join(' ').replace(/[\s,.;:!?—–-]+$/u, '');
}

/** The chunk's English with each run of supplied words between asterisks, as Markdown italics: '*was* king'. What the tutor is sent. */
export const markSupplied = (chunk: EnglishChunk): string =>
  chunk.s && (!Array.isArray(chunk.s) || chunk.s.length) ? englishRuns(chunk).map((r) => (r.supplied ? `*${r.text}*` : r.text)).join(' ') : chunk.t.trim();

export interface Verse {
  n: number;
  /** the MSB's section heading that comes before this verse (English); absent when none */
  h?: string;
  /** 1 when the MSB starts a paragraph at this verse; absent otherwise */
  p?: 1;
  /** Greek words in Greek order */
  g: GreekWord[];
  /** English chunks in English order */
  e: EnglishChunk[];
  /** only on a passage made by src/data/passage.ts: the number of its last verse (`n` is its first). The chunks' `g` indices point into
   * the verse they came from, so a passage's text is for reading, asking and sending, never for the weave. */
  to?: number;
}

export interface LexEntry {
  /** TBESG gloss: 'therefore' */
  g: string;
  /** TBESG definition, plain text, cut at about 300 characters */
  d: string;
}

export interface Chapter {
  book: string;
  code: string;
  chapter: number;
  /** every Strong's number used in this file -> its gloss and definition, once */
  lex: Record<string, LexEntry>;
  /** every parsing code used in this file -> plain words, once */
  parse: Record<string, string>;
  verses: Verse[];
}

/** A chapter with no text: the stand-in where a talk is about a screen, not a text (src/tutor/screen.ts), or a word is added with no chapter open. */
export const NO_CHAPTER: Chapter = { book: '', code: '', chapter: 0, lex: {}, parse: {}, verses: [] };

export interface BookInfo {
  code: string;
  name: string;
  chapters: number;
  /** verse count of each chapter, in order */
  verses: number[];
  /** each chapter's fingerprint, in order: the first 12 hex of the SHA-256 of its file ('' for a chapter a test slice lacks). The app asks for
   * /data/<book>/<n>.json?v=<fingerprint>, so the phone keeps a chapter until its data changes (mw-5r3p30.276) */
  fingerprints: string[];
}

export interface BookIndex {
  books: BookInfo[];
}

export const wordLemma = (w: GreekWord): string => w.l;
export const wordGloss = (chapter: Chapter, w: GreekWord): string => chapter.lex[w.s]?.g ?? '';
export const wordParse = (chapter: Chapter, w: GreekWord): string => chapter.parse[w.p] ?? '';

const chapters = new Map<string, Promise<Chapter>>();

/** The address of a chapter's file: /data/<book>/<n>.json?v=<fingerprint>, the fingerprint from the index in the bundle (src/data/bookIndex.ts).
 * The worker keeps a chapter under that address until its fingerprint changes (src/dataCache.ts), so an unchanged chapter is never fetched
 * again. A chapter the index has no fingerprint for is asked for plain. */
export function chapterUrl(book: string, n: number): string {
  const fingerprint = BOOK_INDEX.books.find((b) => b.code === book)?.fingerprints[n - 1];
  return `/data/${book}/${n}.json${fingerprint ? `?v=${fingerprint}` : ''}`;
}

/** Fetches /data/<book>/<n>.json once; later and concurrent callers share the one request. */
export function loadChapter(book: string, n: number): Promise<Chapter> {
  const key = `${book}/${n}`;
  const known = chapters.get(key);
  if (known) return known;
  const request = fetch(chapterUrl(book, n)).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${key}: ${response.status}`);
    return (await response.json()) as Chapter;
  });
  chapters.set(key, request);
  // A failure is not kept: the next call asks again.
  request.catch(() => {
    if (chapters.get(key) === request) chapters.delete(key);
  });
  return request;
}

let index: Promise<BookIndex> | null = null;

/** Fetches /data/index.json (precached) once: the books and how many chapters each has. A failure is not kept. */
export function loadIndex(): Promise<BookIndex> {
  if (index) return index;
  const request = fetch('/data/index.json').then(async (response) => {
    if (!response.ok) throw new Error(`Could not load the book index: ${response.status}`);
    return (await response.json()) as BookIndex;
  });
  index = request;
  request.catch(() => {
    if (index === request) index = null;
  });
  return request;
}

/** Drops every chapter and the index held in memory (tests). */
export function forgetChapters(): void {
  chapters.clear();
  index = null;
}
