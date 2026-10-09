// src/speech/readAloud.ts — Lampas reads aloud what is shown (mw-5r3p30.21). A verse becomes runs: the English view's
// chunks in English order (en-US), the Greek view's words in Greek order (el-GR), and with the weave on each chunk in its
// own language, neighbours of one language joined so the voice changes only where the language does. A reading speaks the
// runs of a verse one after another (src/speech/greek.ts speakPart: the one engine), publishes verse-reading as each verse
// starts, and goes on to the next verse when it is continuous. Pause stops the speech and keeps the verse; Resume reads that
// verse again from its start (a half-spoken sentence cannot be picked up on every phone). Every stop bumps an epoch, so an
// utterance that ends late starts nothing.
// How far a reading goes is the Read aloud span (src/speech/readSpan.ts, docs/read-aloud.md): the verse, to the next section
// heading, to the chapter's end, or on through the book. Where it goes into another chapter (Book always, Passage when the next
// chapter's first verse has no heading) it asks the Reader to turn to it (openReader) and waits as `crossing`; the Reader that
// opens that chapter hands over its plan (continueReading) and the voice starts verse 1 at once, so the chapter turns just as
// the voice reaches it.
import { useSyncExternalStore } from 'react';
import { loadChapter, type Verse } from '../data/chapter';
import { neighbours } from '../data/neighbours';
import type { ReaderView } from '../data/repositories';
import type { Woven } from '../data/weave';
import { publish } from '../events/bus';
import { openReader } from '../nav/route';
import { hasGreekVoice, isCancelError, speakPart, stopSpeaking } from './greek';
import type { SpeechLanguage } from './languages';
import type { ReadSpan } from './readSpan';
import { keepAwake, letSleep } from './wakeLock';

export interface Run {
  text: string;
  language: SpeechLanguage;
  /** said slower than his speed (a word being sounded out) */
  slow?: boolean;
}

export interface PlanVerse {
  n: number;
  runs: Run[];
  /** a section heading comes before this verse: where a Passage ends */
  heading?: boolean;
}

/** A chapter by its book's code and number. */
export interface ChapterRef {
  book: string;
  chapter: number;
}

/** The line shown when a phone has no Greek voice and Greek is read anyway. */
export const NO_GREEK_VOICE_NOTICE = 'This phone has no Greek voice: Greek is read with the default voice';

const speakable = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

/** What is shown of `verse`, as runs of one language each, in the order it is shown. */
export function runsOf(verse: Verse, view: ReaderView, woven: Woven[] | null): Run[] {
  const parts: Run[] =
    view === 'greek'
      ? verse.g.map((w) => ({ text: w.t, language: 'greek' as const }))
      : verse.e.map((chunk, i) => {
          const words = woven?.[i]?.words;
          return words ? { text: words.map((w) => w.t).join(' '), language: 'greek' as const } : { text: chunk.t, language: 'english' as const };
        });
  const runs: Run[] = [];
  for (const part of parts) {
    const last = runs[runs.length - 1];
    if (last && last.language === part.language) last.text = `${last.text} ${part.text}`;
    else runs.push({ ...part });
  }
  return runs.filter((r) => speakable(r.text)).map((r) => ({ ...r, text: r.text.replace(/\s+/g, ' ').trim() }));
}

/** The whole chapter as it is shown now. `woven` is per verse, as the Reader weaves it (null: no weave). */
export function planOf(verses: Verse[], view: ReaderView, woven: (Woven[] | null)[] | null): PlanVerse[] {
  return verses.map((v, i) => ({ n: v.n, runs: runsOf(v, view, woven?.[i] ?? null), heading: Boolean(v.h) }));
}

export type ReadingStatus = 'idle' | 'reading' | 'paused';

export interface ReadingState {
  status: ReadingStatus;
  /** the verse being read (or paused at); null when idle */
  verse: number | null;
  /** one plain line to show, or null */
  notice: string | null;
  /** the id of the Bible talk answer being read (src/Talk.tsx), or null when it is the chapter being read: the reader's
   * highlight and bar are for the chapter only */
  answer: number | null;
  /** the chapter the reading is going on into: the Reader has been asked to turn to it and the voice waits for its plan
   * (verse is null meanwhile); null otherwise */
  crossing: ChapterRef | null;
}

const IDLE: ReadingState = { status: 'idle', verse: null, notice: null, answer: null, crossing: null };

let state: ReadingState = IDLE;
let plan: PlanVerse[] = [];
let chapterNumber = 0;
/** the code of the book being read, or null for a reading that never leaves its plan (an answer) */
let bookCode: string | null = null;
/** how far this reading goes (a verse button's reading is 'verse') */
let reach: ReadSpan = 'verse';
/** a plan for the verses after the one being read: the chapter was shown differently meanwhile */
let queued: PlanVerse[] | null = null;
let epoch = 0;
const listeners = new Set<() => void>();

function set(next: ReadingState): void {
  state = next;
  listeners.forEach((l) => l());
}

export const getReading = (): ReadingState => state;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useReading(): ReadingState {
  return useSyncExternalStore(subscribe, getReading, getReading);
}

function finish(my: number): void {
  if (my !== epoch) return;
  epoch++;
  letSleep();
  set(IDLE);
  publish({ kind: 'reading-stopped' });
}

/** The phone stopped the speech by itself (another button spoke, the engine was interrupted): wait where we are. */
function interrupted(my: number): void {
  if (my !== epoch) return;
  // An answer has no bar to Resume from: an interrupted one is over.
  if (state.answer !== null) return finish(my);
  epoch++;
  letSleep();
  set({ ...state, status: 'paused' });
}

/** The chapter after the one being read, when this reading may go into it: never for a verse or a chapter, never out of the book. */
function chapterAhead(): ChapterRef | null {
  if (bookCode === null || chapterNumber === 0 || (reach !== 'passage' && reach !== 'book')) return null;
  const next = neighbours(bookCode, chapterNumber).next;
  return next && next.book === bookCode ? { book: next.book, chapter: next.chapter } : null;
}

/** The plan has no verse after `at`: go on into the next chapter when the span allows, else the reading is over. */
function cross(my: number): void {
  const to = chapterAhead();
  if (!to) return finish(my);
  loadChapter(to.book, to.chapter).then(
    (c) => {
      if (my !== epoch) return;
      // a Passage goes on only while the next chapter does not open with a section heading
      if (reach === 'passage' && c.verses[0]?.h) return finish(my);
      set({ ...state, verse: null, crossing: to });
      openReader(to);
    },
    () => finish(my),
  );
}

function afterVerse(at: number, my: number): void {
  if (reach === 'verse') return finish(my);
  const next = plan[at + 1];
  if (!next) return cross(my);
  if (reach === 'passage' && next.heading) return finish(my);
  readRun(next.n, 0, my);
}

function readRun(verse: number, run: number, my: number): void {
  if (my !== epoch) return;
  if (run === 0 && queued) {
    plan = queued;
    queued = null;
  }
  const at = plan.findIndex((v) => v.n === verse);
  const entry = plan[at];
  if (!entry) return finish(my);
  if (run === 0) {
    if (state.verse !== verse) set({ ...state, verse });
    if (state.answer === null) publish({ kind: 'verse-reading', chapter: chapterNumber, verse });
    // the last verse starts the next chapter's load, so the voice need not wait for it
    const ahead = at === plan.length - 1 ? chapterAhead() : null;
    if (ahead) loadChapter(ahead.book, ahead.chapter).catch(() => {});
  }
  const part = entry.runs[run];
  if (!part) return afterVerse(at, my);
  const spoke = speakPart(
    part.text,
    part.language,
    () => readRun(verse, run + 1, my),
    (error) => (isCancelError(error) ? interrupted(my) : finish(my)),
    part.slow,
  );
  if (!spoke) finish(my);
}

function greekAhead(from: number, all: boolean): boolean {
  const ahead = plan.filter((v) => (all ? v.n >= from : v.n === from));
  return ahead.some((v) => v.runs.some((r) => r.language === 'greek'));
}

/** Starts reading at verse `from`: that verse only, or on as far as `span` says when `continuous` (the chapter's end when no
 * span is given; `book` is needed for a span that goes into another chapter). It takes the speech from whatever was being
 * read. Call it straight from the tap (docs/pwa-best-practices.md section 12). */
export function startReading(options: {
  chapter: number;
  plan: PlanVerse[];
  from: number;
  continuous: boolean;
  book?: string;
  span?: ReadSpan;
  answer?: number;
}): void {
  epoch++;
  stopSpeaking();
  plan = options.plan;
  chapterNumber = options.chapter;
  bookCode = options.book ?? null;
  reach = options.continuous ? options.span ?? 'chapter' : 'verse';
  queued = null;
  const notice = hasGreekVoice() === false && greekAhead(options.from, reach !== 'verse') ? NO_GREEK_VOICE_NOTICE : null;
  set({ status: 'reading', verse: options.from, notice, answer: options.answer ?? null, crossing: null });
  keepAwake();
  readRun(options.from, 0, epoch);
}

/** The Reader that opened the chapter a reading was going on into hands over that chapter's plan, and the voice starts its
 * first verse. Nothing happens unless this is the chapter the reading is waiting for (and not paused). */
export function continueReading(options: { book: string; chapter: number; plan: PlanVerse[] }): void {
  const to = state.crossing;
  const first = options.plan[0];
  if (state.status !== 'reading' || !to || to.book !== options.book || to.chapter !== options.chapter) return;
  plan = options.plan;
  chapterNumber = options.chapter;
  bookCode = options.book;
  queued = null;
  if (!first) return finish(epoch);
  const notice = hasGreekVoice() === false && greekAhead(first.n, true) ? NO_GREEK_VOICE_NOTICE : state.notice;
  set({ ...state, verse: first.n, notice, crossing: null });
  readRun(first.n, 0, epoch);
}

/** Stops the speech and keeps the verse, so Resume can go on from it. */
export function pauseReading(): void {
  if (state.status !== 'reading') return;
  // An answer is not waited at: pausing it (the page went to the background) ends it.
  if (state.answer !== null) return stopReading();
  epoch++;
  stopSpeaking();
  letSleep();
  set({ ...state, status: 'paused' });
}

/** Reads on from the verse it was paused at, from the start of that verse. */
export function resumeReading(): void {
  if (state.status !== 'paused' || (state.verse === null && !state.crossing)) return;
  epoch++;
  stopSpeaking();
  set({ ...state, status: 'reading' });
  keepAwake();
  // waiting at a chapter's door: the Reader that opens it carries on
  if (state.crossing || state.verse === null) return;
  readRun(state.verse, 0, epoch);
}

/** Stops for good. */
export function stopReading(): void {
  if (state.status === 'idle') return;
  epoch++;
  stopSpeaking();
  letSleep();
  set(IDLE);
  publish({ kind: 'reading-stopped' });
}

/** The chapter is shown differently now (the view or the weave changed): the verses still to be read follow it, from the
 * next verse on (the one being spoken is finished as it began). */
export function updatePlan(next: PlanVerse[]): void {
  if (state.status !== 'idle' && state.answer === null) queued = next;
}

/** Reads a Bible talk answer aloud (`id` names it), its Greek words in Greek and the rest in English. It takes the speech
 * from whatever was being read. Call it straight from the tap where it can be (docs/pwa-best-practices.md section 12). */
export function startAnswer(id: number, runs: Run[]): void {
  startReading({ chapter: 0, plan: [{ n: id, runs }], from: id, continuous: false, answer: id });
}

/** Stops the Bible talk answer being read, and only that: the chapter's own reading is left alone. */
export function stopAnswer(): void {
  if (state.answer !== null) stopReading();
}

// A page that goes to the background has its speech suspended: wait at the verse; he taps Resume when he is back.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && pauseReading());
}

