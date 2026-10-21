// src/services/reading.ts — the reading check: one verse read aloud, sent as a grist through Postern (bsv-kit/grist) with
// the recording attached, scored by the mill and answered by its verse-read grind (grinds/verse-read.json). The wire work is
// src/services/tutor.ts's askGrind; this file is the request, the answer's shape and the check the phone runs on it.
import { NO_CHAPTER, type Chapter, type GreekWord, type Verse } from '../data/chapter';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { WOVEN_LANG } from '../data/wovenLang';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';
import type { LearnerProfile } from '../data/learnerProfile';
import type { MemoryField } from '../data/learnerMemory';
import type { Recording } from '../audio/recorder';
import { extensionOf, MAX_RECORDING_MS } from '../audio/recorder';
import { chosenAccent } from '../speech/accents';
import { DEFAULT_PRONUNCIATION, pronunciationOf, tutorGuideOf, type GreekPronunciation } from '../speech/pronunciation';
import { greekWordsFitting, type GreekWordEntry } from './greekWords';
import { askGrind, tutorTimings, type AskOptions } from './tutor';

export const READING_KIND = 'verse-read';
export { WOVEN_LANG };

/** The most words a reading may mark, and the most chunks a word may be broken into (the schema's limits). */
export const MAX_FOCUS_WORDS = 8;
export const MAX_CHUNKS = 12;
/** The largest index a focus word may carry (the schema's maximum). */
export const MAX_WORD_INDEX = 2000;
/** The latest second a focus word's times may name (the schema's maximum; a reading is kept to MAX_RECORDING_MS, which is the same ten minutes). */
export const MAX_SECONDS = 600;
/** The longest respelling a focus word's `say` may be (the schema's maximum). */
export const MAX_SAY = 60;

/** What the grind is sent (Verse Read Request 1): the verse, the text he was to read and its language. The mill scores the
 * recording against `target_text` in `lang`, one of the grind's scoring.langs: 'en', or the chosen pronunciation's scoringLang for the Greek
 * ('el' for Modern Greek, src/speech/pronunciation.ts). */
export interface VerseReadRequest {
  reference: string;
  target_text: string;
  lang: string;
  /** with the weave on and some of the verse shown in Greek (mw-5r3p30.411): the verse as he reads it, in the order it is drawn, each piece with its own language ('en', or the
   * Greek pronunciation's scoringLang). `target_text` is their text end to end, so a word's `index` counts the same in both; the mill's scorer turns each piece to IPA in its own language */
  segments?: ReadingSegment[];
  /** with a verse read in Greek: each distinct word of `target_text` with its lemma, gloss, parsing and the app's respelling, syllables and stress, as the Bible talk is sent it (src/services/greekWords.ts, mw-5r3p30.659): a tip on a word's syllables and stress reads them from here, never counts */
  greek_words?: GreekWordEntry[];
  /** the Greek pronunciation the app speaks and respells in (src/speech/pronunciation.ts), as the Bible talk is sent it: a sound in a tip is described by it */
  pronunciation: GreekPronunciation;
  /** that pronunciation's name and sound rules, from its scheme (mw-5r3p30.268, Pronunciation.tutorGuide): a tip on a Greek sound follows them */
  pronunciation_guide: string;
  /** the English the reader hears sounds in (mw-5r3p30.353, Settings > English accent): the tip's sounds and respellings are written for it */
  english_accent: string;
  /** who he is as a student (src/data/learnerProfile.ts, Settings > About you): missing when he has filled in nothing */
  learner_profile?: LearnerProfile;
  /** what Lampas remembers of him (src/data/learnerMemory.ts, Settings > Memory), as the Bible talk is sent it: missing when nothing is kept */
  memory?: MemoryField;
  /** where he stands in words, in one line (src/data/learnerSummary.ts), as the Bible talk is sent it */
  learner?: string;
  /** where his grammar stands (src/data/grammar/learnerGrammar.ts), as the Bible talk is sent it */
  learner_grammar?: LearnerGrammar;
}

/** One piece of a woven verse and the language it is read in. */
export interface ReadingSegment {
  text: string;
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

/** What the grind answers (grinds/verse-read.answer.schema.json). A `partial` reading (version 2) covers the start of the verse and stops: `reached` is the
 * index in target_text of the last word he read and `next_word` the word he stopped at (reached + 1, no times). `incomplete` is nothing clear heard,
 * or, in an answer of version 1, a partial reading as well. */
export interface VerseReadAnswer {
  verdict: 'well-read' | 'some-to-fix' | 'partial' | 'incomplete';
  focus_words: FocusWord[];
  note: string;
  reached?: number;
  next_word?: Omit<FocusWord, 'start' | 'end'>;
}

/** The heading of each verdict: 'Well read' only for a reading that was whole and right. */
export const RESULT_HEADINGS: Record<VerseReadAnswer['verdict'], string> = {
  'well-read': 'Well read',
  'some-to-fix': 'Words to fix',
  partial: 'Part of the verse',
  incomplete: 'Read the whole verse',
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

const OPTIONAL_KEYS = ['say', 'start', 'end'] as const;
/** Both times or neither; each from 0 to the schema's maximum, the end after the start. */
const hasTimes = (f: Record<string, unknown>): boolean => {
  if (f.start === undefined && f.end === undefined) return true;
  const { start, end } = f;
  return typeof start === 'number' && typeof end === 'number' && start >= 0 && end > start && end <= MAX_SECONDS;
};

/** One focus word as the schema limits it; the next word has no times. */
function isFocusWord(f: unknown, withTimes: boolean): boolean {
  const optional = withTimes ? OPTIONAL_KEYS : (['say'] as const);
  return (
    isObject(f) &&
    Object.keys(f).length === 4 + optional.filter((k) => f[k] !== undefined).length &&
    (f.say === undefined || isText(f.say, MAX_SAY)) &&
    (!withTimes || hasTimes(f)) &&
    isText(f.word, 60) &&
    typeof f.index === 'number' &&
    Number.isInteger(f.index) &&
    f.index >= 0 &&
    f.index <= MAX_WORD_INDEX &&
    isText(f.tip, 200) &&
    Array.isArray(f.chunks) &&
    f.chunks.length >= 1 &&
    f.chunks.length <= MAX_CHUNKS &&
    f.chunks.every((c) => isText(c, 20))
  );
}

/** The app's own check of an answer, run before anything is kept (the schema's limits). A partial reading must carry `reached` and `next_word`; no other
 * verdict may (an old `incomplete` answer has neither). */
export function isVerseReadAnswer(value: unknown): value is VerseReadAnswer {
  if (!isObject(value)) return false;
  const partial = value.verdict === 'partial';
  if (Object.keys(value).length !== (partial ? 5 : 3)) return false;
  if (!partial && value.verdict !== 'well-read' && value.verdict !== 'some-to-fix' && value.verdict !== 'incomplete') return false;
  if (!isText(value.note, 400)) return false;
  if (!Array.isArray(value.focus_words) || value.focus_words.length > MAX_FOCUS_WORDS) return false;
  if (partial) {
    if (typeof value.reached !== 'number' || !Number.isInteger(value.reached) || value.reached < 0 || value.reached > MAX_WORD_INDEX) return false;
    if (!isFocusWord(value.next_word, false)) return false;
  }
  return value.focus_words.every((f) => isFocusWord(f, true));
}

/** The respelling a tip spells out in capitals ('say it as LEE-vites', 'luh-VY-tees'), as the voice should speak it: lower case, the
 * hyphens as spaces ('lee vites'). It is a hyphenated run of letters with at least one part in capitals of two letters or more, so a
 * hyphenated word ('well-known') or a shouted word ('NOW') is not one. A run the tip warns against ('Not LEV-its; say LEE-vites.',
 * after not, never, instead of or rather than) is skipped (mw-5r3p30.166). null when the tip gives none. */
export function tipRespelling(tip: string): string | null {
  for (const run of tip.matchAll(/[A-Za-z]+(?:-[A-Za-z]+)+/g)) {
    if (/\b(?:not|never|instead of|rather than)\s*["'“‘(]*$/i.test(tip.slice(0, run.index))) continue;
    if (run[0].split('-').some((part) => /^[A-Z]{2,}$/.test(part))) return run[0].toLowerCase().replace(/-/g, ' ');
  }
  return null;
}

/** What a speaker beside a flagged word says: the respelling the answer gave, else (English only) the respelling its tip spells in
 * capitals, since the phone's voice reads 'Levites' as LEV-its though the tip says LEE-vites (mw-5r3p30.140), else the word as written. A Greek reading's
 * `say` that is not Greek letters ('ee mee') is dropped: the Greek voice reads Latin letters as Greek ones, so it would never say it (mw-5r3p30.701). */
export const sayOf = (fix: { word: string; tip?: string; say?: string }, view: ReadingView = 'english'): string =>
  (view === 'greek' && fix.say !== undefined && !/\p{Script=Greek}/u.test(fix.say) ? undefined : fix.say) ??
  (view === 'english' && fix.tip ? tipRespelling(fix.tip) : null) ??
  fix.word;

/** What the result says when the recorder's cap, not he, ended the reading (mw-5r3p30.684): how long it was heard and, of a partial reading, the last word the scorer heard, so a cut reading is never a silent partial. */
export function cutNote(answer: VerseReadAnswer, targetText: string): string {
  const minutes = Math.round(MAX_RECORDING_MS / 60_000);
  const last = answer.verdict === 'partial' && answer.reached !== undefined ? wordsOfText(targetText)[answer.reached] : undefined;
  return `Your reading was stopped after ${minutes} minutes, the longest this check hears, so only that much was heard.${last ? ` The last word I heard was “${last}”.` : ''}`;
}

/** The note and the tip as he reads them: the grind's model has written a quote as backslash-quote inside a string the JSON
 * already escapes, so a reading kept that way shows plain quote marks (mw-5r3p30.110). */
export const plainQuotes = (text: string): string => text.replace(/\\+"/g, '"');

export type ReadingView = 'english' | 'greek';

/** A verse (or a passage) read as the weave shows it: its pieces in the order they are drawn, and the Greek words among them. */
export interface WovenReading {
  segments: ReadingSegment[];
  words: GreekWord[];
}

/** The text he is asked to read, as one line: the verse's English, its Greek words in Greek order, or, read woven, the pieces of the weave one after another. */
export const readingText = (verse: Verse, view: ReadingView = 'english', weave?: WovenReading | null): string =>
  weave ? weave.segments.map((s) => s.text).join(' ') : view === 'greek' ? verse.g.map((w) => w.t).join(' ') : verse.e.map((c) => c.t.trim()).join(' ');

/** The verses of a unit as the weave shows them to be read (mw-5r3p30.411): the Greek of a woven chunk in Greek (`greek`: the scoring language of the chosen pronunciation), every other chunk in
 * English, chunk by chunk in the order the verse is drawn (a Greek-order weave lays them out in the Greek word order), each verse after the one before. Neighbours in one language are one segment.
 * `woven` is each verse's weave, in step with `verses`. null when no chunk is shown in Greek: that reading is the plain English one. */
export function wovenReading(verses: readonly Verse[], woven: readonly (WovenVerse | null | undefined)[], greek: string): WovenReading | null {
  const segments: ReadingSegment[] = [];
  const words: GreekWord[] = [];
  const add = (text: string, lang: string): void => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last?.lang === lang) last.text += ` ${text}`;
    else segments.push({ text, lang });
  };
  verses.forEach((verse, v) => {
    const weave = woven[v] ?? null;
    for (const i of drawnOrder(verse, weave)) {
      const weft = weave?.[i];
      if (weft) {
        words.push(...weft.words);
        add(weft.words.map((w) => w.t).join(' '), greek);
      } else add(chunkText(verse, weave, i).trim(), 'en');
    }
  });
  return words.length === 0 ? null : { segments, words };
}

/** The language the mill scores a reading in: English, or the chosen Greek pronunciation's. */
export const readingLang = (view: ReadingView, pronunciation: unknown): string =>
  view === 'greek' ? pronunciationOf(pronunciation).scoringLang : 'en';

export function buildReadingRequest(reference: string, verse: Verse, view: ReadingView = 'english', lang: string = readingLang(view, undefined), learnerProfile?: LearnerProfile, learner?: string, learnerGrammar?: LearnerGrammar, pronunciation: GreekPronunciation = DEFAULT_PRONUNCIATION, memory?: MemoryField, chapter: Chapter = NO_CHAPTER, weave?: WovenReading | null): VerseReadRequest {
  const woven = view === 'english' ? weave ?? null : null;
  const request: VerseReadRequest = {
    reference,
    target_text: readingText(verse, view, woven),
    lang,
    ...(woven ? { segments: woven.segments } : {}),
    pronunciation,
    pronunciation_guide: tutorGuideOf(pronunciationOf(pronunciation)),
    english_accent: chosenAccent().id,
    ...(learnerProfile ? { learner_profile: learnerProfile } : {}),
    ...(memory ? { memory } : {}),
    ...(learner ? { learner } : {}),
    ...(learnerGrammar ? { learner_grammar: learnerGrammar } : {}),
  };
  if (view !== 'greek' && !woven) return request;
  // the words of the verse (a woven reading's: the ones shown in Greek) weigh what the rest leaves of the record, up to GREEK_WORDS_BYTES (the Bible talk's rule); a reading names no word, so none is held past the budget
  const words = greekWordsFitting(chapter, [woven ? { ...verse, g: woven.words } : verse], '', pronunciation, new TextEncoder().encode(JSON.stringify(request)).length);
  return words.length > 0 ? { ...request, greek_words: words } : request;
}

/** The mill's local scorer limit for a clip of `seconds` (mw-gq6.660, scorer.LocalTimeoutFor): 120 s and half a second per second of audio, at most 540 s. */
export const scorerLimitMs = (seconds: number): number => Math.min(540_000, 120_000 + 500 * Math.max(0, seconds));
/** What the model's step after the scorer is allowed. */
const MODEL_STEP_MS = 60_000;
/** The recorder's rate (audioBitsPerSecond 32_000), for the size of a clip not yet made: 4000 bytes a second. */
const CLIP_BYTES_PER_SECOND = 4000;
/** What a slow phone link carries: 160 kbit/s, or 20 bytes a millisecond. A 600 s clip (2.4 MB) is allowed 30 s and 120 s: 150 s. */
const SLOW_LINK_BYTES_PER_MS = 20;
const UPLOAD_FLOOR_MS = 30_000;

/** How long the clip's upload may take: the door's 30 s, and the time `bytes` need on a slow link. */
export const uploadTimeoutMs = (bytes: number): number => UPLOAD_FLOOR_MS + Math.ceil(bytes / SLOW_LINK_BYTES_PER_MS);

/** How long a reading of `seconds` is waited for: the scorer's limit for that clip, the model's step and the upload, never below the tutor's 180 s. */
export const readingDeadlineMs = (seconds: number): number =>
  Math.max(tutorTimings.deadlineMs, scorerLimitMs(seconds) + MODEL_STEP_MS + uploadTimeoutMs(seconds * CLIP_BYTES_PER_SECOND));

/** What he is told when the check of his reading ran out of its time: the mill had the clip, so the tutor is not offline. */
export const READING_TOO_LONG_MESSAGE = 'That reading took too long to check. Try a shorter passage.';

/** What he is told when the clip of his reading did not finish uploading: his connection was too slow, the mill never had it (mw-5r3p30.690). */
export const READING_UPLOAD_TOO_SLOW_MESSAGE = 'That reading is taking too long to send. Check your connection and try again.';

/** Sends the recording of a verse read aloud and waits for the mill's answer (the verse-read grind). Throws a TutorError. */
export async function askVerseRead(request: VerseReadRequest, recording: Recording, options: AskOptions): Promise<VerseReadAnswer> {
  const bytes = new Uint8Array(await recording.blob.arrayBuffer());
  const file = { bytes, mime: recording.mime, name: `reading.${extensionOf(recording.mime)}` };
  const seconds = recording.durationMs / 1000;
  return askGrind(READING_KIND, request, isVerseReadAnswer, {
    deadlineMs: readingDeadlineMs(seconds),
    uploadTimeoutMs: uploadTimeoutMs(bytes.length),
    tookTooLong: READING_TOO_LONG_MESSAGE,
    uploadSlow: READING_UPLOAD_TOO_SLOW_MESSAGE,
    ...options,
    files: [file],
  });
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
