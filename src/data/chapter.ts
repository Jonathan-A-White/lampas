// One chapter of the Greek New Testament as public/data/<book>/<chapter>.json holds it (docs/data.md).
// Screens read a chapter through loadChapter and the word helpers below, never through the short keys.

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
  /** 1 when part of the chunk is supplied: it has [bracketed] words in the MSB */
  s?: 1;
}

export interface Verse {
  n: number;
  /** Greek words in Greek order */
  g: GreekWord[];
  /** English chunks in English order */
  e: EnglishChunk[];
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

export interface BookInfo {
  code: string;
  name: string;
  chapters: number;
  /** verse count of each chapter, in order */
  verses: number[];
}

export interface BookIndex {
  books: BookInfo[];
}

export const wordLemma = (w: GreekWord): string => w.l;
export const wordGloss = (chapter: Chapter, w: GreekWord): string => chapter.lex[w.s]?.g ?? '';
export const wordParse = (chapter: Chapter, w: GreekWord): string => chapter.parse[w.p] ?? '';

const chapters = new Map<string, Promise<Chapter>>();

/** Fetches /data/<book>/<n>.json once; later and concurrent callers share the one request. */
export function loadChapter(book: string, n: number): Promise<Chapter> {
  const key = `${book}/${n}`;
  const known = chapters.get(key);
  if (known) return known;
  const request = fetch(`/data/${key}.json`).then(async (response) => {
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

/** Drops every chapter held in memory (tests). */
export function forgetChapters(): void {
  chapters.clear();
}
