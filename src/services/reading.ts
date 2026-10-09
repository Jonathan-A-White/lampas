// src/services/reading.ts — the reading check: one verse read aloud, sent as a grist through Postern (bsv-kit/grist) with
// the recording attached, scored by the mill and answered by its verse-read grind (grinds/verse-read.json). The wire work is
// src/services/tutor.ts's askGrind; this file is the request, the answer's shape and the check the phone runs on it.
import type { Verse } from '../data/chapter';
import type { Recording } from '../audio/recorder';
import { extensionOf } from '../audio/recorder';
import { pronunciationOf } from '../speech/pronunciation';
import { askGrind, type AskOptions } from './tutor';

export const READING_KIND = 'verse-read';

/** The most words a reading may mark, and the most chunks a word may be broken into (the schema's limits). */
export const MAX_FOCUS_WORDS = 8;
export const MAX_CHUNKS = 12;
/** The largest index a focus word may carry (the schema's maximum). */
export const MAX_WORD_INDEX = 2000;
/** The latest second a focus word's times may name (the schema's maximum; a reading is kept to a minute). */
export const MAX_SECONDS = 600;
/** The longest respelling a focus word's `say` may be (the schema's maximum). */
export const MAX_SAY = 60;

/** What the grind is sent (Verse Read Request 1): the verse, the text he was to read and its language. The mill scores the
 * recording against `target_text` in `lang`, one of the grind's scoring.langs: 'en', or 'el' for the Greek read in modern
 * pronunciation (the registry's scoringLang, src/speech/pronunciation.ts). */
export interface VerseReadRequest {
  reference: string;
  target_text: string;
  lang: string;
}

/** One word he misread, broken into chunks to say. */
export interface FocusWord {
  word: string;
  /** where this exact instance stands in target_text, counting its words from 0 (the verse has the same word twice often) */
  index: number;
  chunks: string[];
  tip: string;
  /** how the English voice should be given the word to say it right ('blest' for 'blessed'); absent when the word is spoken as written */
  say?: string;
  /** where the word stands in his recording, in seconds, copied from the scorer's times; both or neither (absent: no 'Me' button) */
  start?: number;
  end?: number;
}

/** What the grind answers (grinds/verse-read.answer.schema.json). */
export interface VerseReadAnswer {
  verdict: 'well-read' | 'some-to-fix' | 'incomplete';
  focus_words: FocusWord[];
  note: string;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

const OPTIONAL_KEYS = ['say', 'start', 'end'] as const;
/** Both times or neither; each from 0 to the schema's maximum, the end after the start. */
const hasTimes = (f: Record<string, unknown>): boolean => {
  if (f.start === undefined && f.end === undefined) return true;
  const { start, end } = f;
  return typeof start === 'number' && typeof end === 'number' && start >= 0 && end > start && end <= MAX_SECONDS;
};

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isVerseReadAnswer(value: unknown): value is VerseReadAnswer {
  if (!isObject(value) || Object.keys(value).length !== 3) return false;
  if (value.verdict !== 'well-read' && value.verdict !== 'some-to-fix' && value.verdict !== 'incomplete') return false;
  if (!isText(value.note, 400)) return false;
  if (!Array.isArray(value.focus_words) || value.focus_words.length > MAX_FOCUS_WORDS) return false;
  return value.focus_words.every(
    (f) =>
      isObject(f) &&
      Object.keys(f).length === 4 + OPTIONAL_KEYS.filter((k) => f[k] !== undefined).length &&
      (f.say === undefined || isText(f.say, MAX_SAY)) &&
      hasTimes(f) &&
      isText(f.word, 60) &&
      typeof f.index === 'number' &&
      Number.isInteger(f.index) &&
      f.index >= 0 &&
      f.index <= MAX_WORD_INDEX &&
      isText(f.tip, 200) &&
      Array.isArray(f.chunks) &&
      f.chunks.length >= 1 &&
      f.chunks.length <= MAX_CHUNKS &&
      f.chunks.every((c) => isText(c, 20)),
  );
}

/** What a speaker beside a flagged word says: the respelling the answer gave, else the word as written. */
export const sayOf = (fix: { word: string; say?: string }): string => fix.say ?? fix.word;

/** The note and the tip as he reads them: the grind's model has written a quote as backslash-quote inside a string the JSON
 * already escapes, so a reading kept that way shows plain quote marks (mw-5r3p30.110). */
export const plainQuotes = (text: string): string => text.replace(/\\+"/g, '"');

export type ReadingView = 'english' | 'greek';

/** The text he is asked to read, as one line: the verse's English, or its Greek words in Greek order. */
export const readingText = (verse: Verse, view: ReadingView = 'english'): string =>
  view === 'greek' ? verse.g.map((w) => w.t).join(' ') : verse.e.map((c) => c.t.trim()).join(' ');

/** The language the mill scores a reading in: English, or the chosen Greek pronunciation's. */
export const readingLang = (view: ReadingView, pronunciation: unknown): string =>
  view === 'greek' ? pronunciationOf(pronunciation).scoringLang : 'en';

export function buildReadingRequest(reference: string, verse: Verse, view: ReadingView = 'english', lang: string = readingLang(view, undefined)): VerseReadRequest {
  return { reference, target_text: readingText(verse, view), lang };
}

/** Sends the recording of a verse read aloud and waits for the mill's answer (the verse-read grind). Throws a TutorError. */
export async function askVerseRead(request: VerseReadRequest, recording: Recording, options: AskOptions): Promise<VerseReadAnswer> {
  const bytes = new Uint8Array(await recording.blob.arrayBuffer());
  const file = { bytes, mime: recording.mime, name: `reading.${extensionOf(recording.mime)}` };
  return askGrind(READING_KIND, request, isVerseReadAnswer, { ...options, files: [file] });
}

/** A word as it is compared: no case, no accents or breathings, a final sigma as a sigma, no punctuation. The mill may write
 * a Greek word without its accents, and that must still find the word in the verse. */
export const normalWord = (word: string): string =>
  word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]/gu, '');

/** The verse's words as the scorer counts them: split on white space, in order (a focus word's `index` counts these). */
export const wordsOfText = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** Which words of `text` the focus words mark: a map from a word's place in the verse to the focus word that marks it, and the
 * focus words that mark nothing (their place is not in the verse). Only the exact instance named by `index` is marked, never
 * every word spelled alike. A word with no index (a reading kept before the mill gave one) marks every word spelled so. */
export function markWords<W extends { word: string; index?: number }>(text: string, words: W[]): { marked: Map<number, W>; lost: W[] } {
  const tokens = wordsOfText(text);
  const marked = new Map<number, W>();
  const lost: W[] = [];
  for (const w of words) {
    if (w.index !== undefined) {
      if (w.index < tokens.length && !marked.has(w.index)) marked.set(w.index, w);
      else if (w.index >= tokens.length) lost.push(w);
      continue;
    }
    const spelled = normalWord(w.word);
    const at = tokens.flatMap((t, i) => (normalWord(t) === spelled ? [i] : []));
    for (const i of at) if (!marked.has(i)) marked.set(i, w);
    if (at.length === 0) lost.push(w);
  }
  return { marked, lost };
}
