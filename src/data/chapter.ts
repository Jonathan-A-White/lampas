// One chapter of the Bible as public/data/<book>/<chapter>.json holds it (docs/data.md): the Greek New Testament, and the Old Testament
// with its Hebrew words kept. A chapter says its source language (`lang`) and its translation (`translation`); the word and chunk keys
// are the same for every source language. Screens read a chapter through loadChapter and the word helpers below, never through the short keys.

import { CANON_INDEX, greekBooks } from './bookIndex';
import { within } from './within';

/** The language a chapter's words are in: Koine Greek ('grc') or Biblical Hebrew ('hbo', whose Aramaic verses are words of the same chapter). */
export type SourceLanguage = 'grc' | 'hbo';

/**
 * A word of the source text. The name is the Greek one it was born with; the same keys hold a Hebrew word (docs/data.md has each key's meaning for it).
 * For a Hebrew word: `t` is the pointed word as the table's WLC column has it, `tr` the table's transliteration, `s` the Strong's number with
 * no padding ('H7225'; '' where the table gives none), `l` the TBESH headword, `p` the table's short parsing code ('V-Qal-Perf-3ms'), `gl` the word's own gloss.
 */
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
  /** Hebrew only: this word's gloss where it differs from its lemma's (`lex[s].g`): a verb in a stem whose sense has its own gloss ('to appoint' for the Piel of מָנָה, 'to count'); absent otherwise */
  gl?: string;
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

/** The marks the verse's punctuation leaves at a chunk's ends: stops, commas, dashes, brackets, an ellipsis, double quotes, an opening single quote. */
const EDGE_MARK = /[\s.,;:!?…—–\-"“”‘()[\]]/u;
const APOSTROPHE = /[’']/u;
const WORDLIKE = /[\p{L}\p{N}]/u;

/**
 * A chunk's English as the words alone, for a sheet that shows it out of its verse (mw-5r3p30.265): 'at all times.' is 'at all times',
 * '“super-apostles,”' is 'super-apostles'. Only the ends lose marks; an apostrophe or a hyphen inside stays ('Lord’s,' is 'Lord’s'). A ’ at the
 * end is a closing quote after a mark ('going?’') or when a ‘ opened the chunk ('‘Yes’'), and a possessive after a letter ('Jesus’'), which
 * stays. A chunk of nothing but marks ('(-') is given back as it stands. The Reader's own text never goes through this.
 */
export function bareEnglish(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && (EDGE_MARK.test(text[start]) || APOSTROPHE.test(text[start]))) start++;
  const quoted = text.slice(0, start).includes('‘');
  while (end > start) {
    const mark = text[end - 1];
    if (EDGE_MARK.test(mark)) end--;
    else if (APOSTROPHE.test(mark) && (!WORDLIKE.test(text[end - 2] ?? '') || (quoted && !text.slice(start, end - 1).includes('’')))) end--;
    else break;
  }
  const words = text.slice(start, end);
  return WORDLIKE.test(words) ? words : text.trim();
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
  return bareEnglish(words.slice(start, end).map((w) => w.text).join(' '));
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
  /** the language the words of `verses` are in; absent means 'grc': the New Testament's files carry neither this nor `translation`, and loadChapter fills them (sourceLanguage reads it) */
  lang?: SourceLanguage;
  /** the translation the English chunks are from: 'msb', the Majority Standard Bible (its Old Testament is the Berean Standard Bible's); absent means 'msb' */
  translation?: string;
  /** every Strong's number used in this file -> its gloss and definition, once */
  lex: Record<string, LexEntry>;
  /** every parsing code used in this file -> plain words, once */
  parse: Record<string, string>;
  verses: Verse[];
  /** the New Testament's variant readings, the Robinson-Pierpont 2018 apparatus laid on the words of `verses` (docs/data.md 'Variants'); absent in the Old Testament */
  variants?: VariantUnit[];
}

/** Whose reading an apparatus reading is: B the other reading where the Byzantine manuscripts divide, N the Nestle-Aland text (27th and 28th editions),
 *  C NA27 and NA28 together, S NA27 only, E NA28 only, M the Editio Critica Maior (docs/data.md 'Variants'). */
export type VariantCode = 'B' | 'N' | 'C' | 'S' | 'E' | 'M';
export interface VariantReading {
  code: VariantCode;
  /** the reading's words as the apparatus writes them; '' when it leaves the base out */
  text: string;
}
/** One place of the apparatus: the words of verse `v` it is about (indexes into the verse's `g`), the text's own words there, and the other readings. */
export interface VariantPlace {
  v: number;
  w: number[];
  base: string;
  alts: VariantReading[];
}
/** A place with its English, its witness and whether it changes the English: what a chapter file keeps. */
export interface VariantUnit extends VariantPlace {
  /** the unit in English: the base and each of `alts` (the same order), 0 to 6 words each, '' for a reading that leaves words out (docs/data.md 'Variant English') */
  english: VariantEnglish;
  /** true when the English of the base and of any alternative differ after case, punctuation and white space are set aside */
  changesEnglish: boolean;
  /** whose reading the first of its codes names: `byz` (B), `na` (N, C, S, E) or `ecm` (M); several codes take the first class in that order */
  witness: VariantWitness;
}
/** `msb`: the MSB's own footnote ('CT ...') gave it; `lampas`: made at build time by the tutor's model (data/variant-english.json). */
export type VariantEnglishSource = 'msb' | 'lampas';
export interface VariantEnglish {
  source: VariantEnglishSource;
  base: string;
  alts: string[];
}
export type VariantWitness = 'byz' | 'na' | 'ecm';

/** A chapter with no text: the stand-in where a talk is about a screen, not a text (src/tutor/screen.ts), or a word is added with no chapter open. */
export const NO_CHAPTER: Chapter = { book: '', code: '', chapter: 0, lang: 'grc', translation: 'msb', lex: {}, parse: {}, verses: [] };

/** The language a chapter's words are in: 'grc' for a chapter that does not say. */
export const sourceLanguage = (chapter: Pick<Chapter, 'lang'>): SourceLanguage => chapter.lang ?? 'grc';

/** A chapter as its file has it, with the language and translation an older file leaves out filled in ('grc', 'msb'), so a chapter kept on a phone still reads. */
export const fillChapter = (file: Chapter): Chapter => ({ ...file, lang: file.lang ?? 'grc', translation: file.translation ?? 'msb' });

export interface BookInfo {
  code: string;
  name: string;
  chapters: number;
  /** verse count of each chapter, in order */
  verses: number[];
  /** each chapter's fingerprint, in order: the first 12 hex of the SHA-256 of its file ('' for a chapter a test slice lacks). The app asks for
   * /data/<book>/<n>.json?v=<fingerprint>, so the phone keeps a chapter until its data changes (mw-5r3p30.276) */
  fingerprints: string[];
  /** the language the book is read in; absent in an index from before the Old Testament means 'grc' */
  lang?: SourceLanguage;
}

export interface BookIndex {
  books: BookInfo[];
  /** The fingerprint of each reading ladder list (public/data/ladder/<lang>.json), written by `npm run ladder`: a list is asked for as ?v=<fingerprint>, so a rescored one is fetched again (mw-9ji6ek0.10). */
  ladders?: Partial<Record<'el' | 'en' | 'he', string>>;
}

export const wordLemma = (w: GreekWord): string => w.l;
export const wordGloss = (chapter: Chapter, w: GreekWord): string => w.gl ?? chapter.lex[w.s]?.g ?? '';
export const wordParse = (chapter: Chapter, w: GreekWord): string => chapter.parse[w.p] ?? '';

const chapters = new Map<string, Promise<Chapter>>();

/** The address of a chapter's file: /data/<book>/<n>.json?v=<fingerprint>, the fingerprint from the index in the bundle (src/data/bookIndex.ts).
 * The worker keeps a chapter under that address until its fingerprint changes (src/dataCache.ts), so an unchanged chapter is never fetched
 * again. A chapter the index has no fingerprint for is asked for plain. */
export function chapterUrl(book: string, n: number): string {
  const fingerprint = CANON_INDEX.books.find((b) => b.code === book)?.fingerprints[n - 1];
  return `/data/${book}/${n}.json${fingerprint ? `?v=${fingerprint}` : ''}`;
}

/** The address of a reading ladder's list: /data/ladder/<lang>.json?v=<fingerprint>, the fingerprint from the index in the bundle; plain when the index has none. */
export function ladderUrl(lang: 'el' | 'en' | 'he'): string {
  const fingerprint = CANON_INDEX.ladders?.[lang];
  return `/data/ladder/${lang}.json${fingerprint ? `?v=${fingerprint}` : ''}`;
}

/** Fetches /data/<book>/<n>.json once; later and concurrent callers share the one request. */
export function loadChapter(book: string, n: number): Promise<Chapter> {
  const key = `${book}/${n}`;
  const known = chapters.get(key);
  if (known) return known;
  // A fetch the worker never answers (a half-written cache entry) is given up on, so the Reader can say so rather than load for ever (mw-5r3p30.846).
  const request = within(async (signal) => {
    const response = await fetch(chapterUrl(book, n), { signal });
    if (!response.ok) throw new Error(`Could not load ${key}: ${response.status}`);
    return fillChapter((await response.json()) as Chapter);
  });
  chapters.set(key, request);
  // A failure is not kept: the next call asks again.
  request.catch(() => {
    if (chapters.get(key) === request) chapters.delete(key);
  });
  return request;
}

/** Forgets a chapter's request still in flight, so the next loadChapter asks afresh (the Reader's Try again). */
export function forgetChapter(book: string, n: number): void {
  chapters.delete(`${book}/${n}`);
}

let index: Promise<BookIndex> | null = null;

/** Fetches /data/index.json (precached) once: the 66 books of the canon and how many chapters each has. A failure is not kept. */
export function loadCanonIndex(): Promise<BookIndex> {
  if (index) return index;
  const request = within(async (signal) => {
    const response = await fetch('/data/index.json', { signal });
    if (!response.ok) throw new Error(`Could not load the book index: ${response.status}`);
    return (await response.json()) as BookIndex;
  });
  index = request;
  request.catch(() => {
    if (index === request) index = null;
  });
  return request;
}

/** The books of the New Testament and how many chapters each has, from the same file: what the pickers and goals read until the Old Testament opens (mw-uqlxea.2). */
export const loadIndex = (): Promise<BookIndex> => loadCanonIndex().then(greekBooks);

/** Forgets the index request still in flight, so the next loadCanonIndex asks afresh (a picker's Try again). */
export function forgetCanonIndex(): void {
  index = null;
}

/** Drops every chapter and the index held in memory (tests). */
export function forgetChapters(): void {
  chapters.clear();
  index = null;
}
