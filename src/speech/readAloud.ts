// src/speech/readAloud.ts — Lampas reads aloud what is shown (mw-5r3p30.21). A verse becomes runs: the English view's
// chunks in English order (en-US), the Greek view's words in Greek order (el-GR), and with the weave on each chunk in its
// own language, neighbours of one language joined so the voice changes only where the language does. A reading speaks the
// runs of a verse one after another (src/speech/greek.ts speakPart: the one engine), publishes verse-reading as each verse
// starts, and goes on to the next verse when it is continuous. Pause stops the speech and keeps the verse; Resume reads that
// verse again from its start (a half-spoken sentence cannot be picked up on every phone). Every stop bumps an epoch, so an
// utterance that ends late starts nothing.
import { useSyncExternalStore } from 'react';
import type { Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import type { Woven } from '../data/weave';
import { publish } from '../events/bus';
import { hasGreekVoice, isCancelError, speakPart, stopSpeaking } from './greek';
import type { SpeechLanguage } from './languages';
import { keepAwake, letSleep } from './wakeLock';

export interface Run {
  text: string;
  language: SpeechLanguage;
}

export interface PlanVerse {
  n: number;
  runs: Run[];
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
          const words = woven?.[i];
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
  return verses.map((v, i) => ({ n: v.n, runs: runsOf(v, view, woven?.[i] ?? null) }));
}

export type ReadingStatus = 'idle' | 'reading' | 'paused';

export interface ReadingState {
  status: ReadingStatus;
  /** the verse being read (or paused at); null when idle */
  verse: number | null;
  /** one plain line to show, or null */
  notice: string | null;
}

const IDLE: ReadingState = { status: 'idle', verse: null, notice: null };

let state: ReadingState = IDLE;
let plan: PlanVerse[] = [];
let chapterNumber = 0;
let continuous = false;
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
  epoch++;
  letSleep();
  set({ ...state, status: 'paused' });
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
    publish({ kind: 'verse-reading', chapter: chapterNumber, verse });
  }
  const part = entry.runs[run];
  if (!part) {
    const next = continuous ? plan[at + 1] : undefined;
    return next ? readRun(next.n, 0, my) : finish(my);
  }
  const spoke = speakPart(
    part.text,
    part.language,
    () => readRun(verse, run + 1, my),
    (error) => (isCancelError(error) ? interrupted(my) : finish(my)),
  );
  if (!spoke) finish(my);
}

function greekAhead(from: number, all: boolean): boolean {
  const ahead = plan.filter((v) => (all ? v.n >= from : v.n === from));
  return ahead.some((v) => v.runs.some((r) => r.language === 'greek'));
}

/** Starts reading at verse `from`: that verse only, or on to the chapter's end when `continuous`. It takes the speech
 * from whatever was being read. Call it straight from the tap (docs/pwa-best-practices.md section 12). */
export function startReading(options: { chapter: number; plan: PlanVerse[]; from: number; continuous: boolean }): void {
  epoch++;
  stopSpeaking();
  plan = options.plan;
  chapterNumber = options.chapter;
  continuous = options.continuous;
  queued = null;
  const notice = hasGreekVoice() === false && greekAhead(options.from, options.continuous) ? NO_GREEK_VOICE_NOTICE : null;
  set({ status: 'reading', verse: options.from, notice });
  keepAwake();
  readRun(options.from, 0, epoch);
}

/** Stops the speech and keeps the verse, so Resume can go on from it. */
export function pauseReading(): void {
  if (state.status !== 'reading') return;
  epoch++;
  stopSpeaking();
  letSleep();
  set({ ...state, status: 'paused' });
}

/** Reads on from the verse it was paused at, from the start of that verse. */
export function resumeReading(): void {
  if (state.status !== 'paused' || state.verse === null) return;
  epoch++;
  stopSpeaking();
  set({ ...state, status: 'reading' });
  keepAwake();
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
  if (state.status !== 'idle') queued = next;
}

// A page that goes to the background has its speech suspended: wait at the verse; he taps Resume when he is back.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && pauseReading());
}

