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
