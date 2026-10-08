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
  chunks: string[];
  tip: string;
}

/** What the grind answers (grinds/verse-read.answer.schema.json). */
export interface VerseReadAnswer {
  verdict: 'well-read' | 'some-to-fix';
  focus_words: FocusWord[];
  note: string;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isVerseReadAnswer(value: unknown): value is VerseReadAnswer {
  if (!isObject(value) || Object.keys(value).length !== 3) return false;
  if (value.verdict !== 'well-read' && value.verdict !== 'some-to-fix') return false;
  if (!isText(value.note, 400)) return false;
  if (!Array.isArray(value.focus_words) || value.focus_words.length > MAX_FOCUS_WORDS) return false;
  return value.focus_words.every(
    (f) =>
      isObject(f) &&
      Object.keys(f).length === 3 &&
      isText(f.word, 60) &&
      isText(f.tip, 200) &&
      Array.isArray(f.chunks) &&
      f.chunks.length >= 1 &&
      f.chunks.length <= MAX_CHUNKS &&
      f.chunks.every((c) => isText(c, 20)),
  );
}

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
