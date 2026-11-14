// src/speech/readAloud.ts — Lampas reads aloud what is shown (mw-5r3p30.21). A verse becomes runs: the English view's
// chunks in English order (en-US), the Greek view's words in Greek order (el-GR), and with the weave on each chunk in its
// own language, neighbours of one language joined so the voice changes only where the language does. The runs of a verse are
// handed to voice-kit/speech as ONE speech under READ_KEY, a run to a line: the package cuts it into sentences, reads each in the
// language of its letters, keeps the sentence reached on Pause and shows its one bar (Pause / Resume, Restart, Stop). This file
// goes on to the next verse when a verse is over and the reading is continuous, publishes verse-reading as each verse starts, and
// follows the package: a Pause, Resume or Stop made on the bar moves the state here (syncWithEngine). A word said while a reading is under
// way (a long press, a speaker) PAUSES it (greek.ts speakBeside says the word beside it), so Resume goes on from the sentence it was in.
// How far a reading goes is its span (src/speech/readSpan.ts, docs/read-aloud.md): the verse a tap started (a verse's play or Listen), a section or a
// chapter (a Listen on a heading's view or the place line's chapter view), or, for the header's Play, Play to: on through the book or through the Bible.
// Where it goes into another chapter (Play to either) it asks the Reader to turn to it (openReader), into the next book too for the Bible, and waits as
// `crossing`; the Reader that opens that chapter hands over its plan (continueReading) and the voice starts verse 1 at once, so the chapter turns just
// as the voice reaches it.
import { useSyncExternalStore } from 'react';
import { getSpeech, isSpeaking, pause as enginePause, resume as engineResume, stop as engineStop, subscribe as subscribeEngine } from 'voice-kit/speech';
import { spanOf, type ChapterTimings } from '../data/audioTimings';
import { loadChapter, type SourceLanguage, type Verse } from '../data/chapter';
import { neighbours } from '../data/neighbours';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { publish } from '../events/bus';
import { openReader } from '../nav/route';
import { septuagintVerseView } from '../reader/septuagint';
import { besideNow, greekVoiceForm, hasGreekVoice, hasVoice, isWordSpeech, loneLetterCuts, playInTurn, playLetterClip, READ_KEY, speakText, stopLetterClip, subscribeBeside, type Piece } from './greek';
import type { SpeechLanguage } from './languages';
import { hebrewVoiceForm } from './pronunciation';
import type { ReadSpan } from './readSpan';
import { showSession } from './mediaSession';
import { pauseRecording, playRecording, resumeRecording, seekToVerse, stopRecording } from './recordedVoice';
import { titleOf } from '../data/books';
import { dropWaiting } from './tutorWaiting';
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

/** The line shown when a phone has no Hebrew voice and Hebrew is read anyway (the same line a Hebrew word's tap shows, src/speech/greek.ts noVoiceHelp). */
export const NO_HEBREW_VOICE_NOTICE = 'No Hebrew voice on this phone';

/** The line shown when the recorded voice fails and the phone's voice reads on from the verse in hand (mw-82lb97i.3). */
export const RECORDING_FAILED_NOTICE = 'The recorded voice could not be reached: reading with the phone voice';

const speakable = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

/** What is shown of `verse`, as runs of one language each, in the order it is shown. `source` is the language of the chapter's own words: the Greek view and the words
 * the weave shows are read in it ('hbo' is Hebrew, in the he-IL voice). */
export function runsOf(verse: Verse, chapterView: ReaderView, woven: WovenVerse | null, source: SourceLanguage = 'grc'): Run[] {
  // a verse with Greek words and no English chunk is read in Greek, as it is drawn (mw-u2w5klk.274.7)
  const view = septuagintVerseView(chapterView, verse);
  const language = source === 'hbo' ? ('hebrew' as const) : ('greek' as const);
  const parts: Run[] =
    view === 'greek'
      ? verse.g.map((w) => ({ text: w.t, language }))
      : drawnOrder(verse, woven).map((i) => {
          const words = woven?.[i]?.words;
          return words ? { text: words.map((w) => w.t).join(' '), language } : { text: chunkText(verse, woven, i), language: 'english' as const };
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
export function planOf(verses: Verse[], view: ReaderView, woven: (WovenVerse | null)[] | null, source: SourceLanguage = 'grc'): PlanVerse[] {
  return verses.map((v, i) => ({ n: v.n, runs: runsOf(v, view, woven?.[i] ?? null, source), heading: Boolean(v.h) }));
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
  /** the speaking bar holds this reading (its Pause, Resume, Restart and Stop are the controls): the package's bar for the phone's voice, RecordedBar for a recording;
   * false when the voice was taken by a word said alone and the reading waits at its verse, with only the header to Resume it */
  onBar: boolean;
  /** the chapter's recording is heard (src/speech/recordedVoice.ts): the bar is RecordedBar's, whose controls are this file's pauseReading, resumeReading, restartRecorded and stopReading */
  recorded: boolean;
  /** the key of the Listen this reading is (a passage or a verse in the Verse view, listenKeyOf), or null for any other reading: a Listen is paused by an
   * interruption from inside the app and goes on by itself when it ends */
  listen: string | null;
}

const IDLE: ReadingState = { status: 'idle', verse: null, notice: null, answer: null, crossing: null, onBar: false, recorded: false, listen: null };

let state: ReadingState = IDLE;
let plan: PlanVerse[] = [];
let chapterNumber = 0;
/** the code of the book being read, or null for a reading that never leaves its plan (an answer) */
let bookCode: string | null = null;
/** the book the plan is of, for a reading that never leaves its plan (a passage); with bookCode it tells which chapter a paused reading belongs to */
let planBook: string | null = null;
/** how far this reading goes (a verse button's reading is 'verse'; the header's Play is Play to: 'book' or 'bible') */
let reach: ReadSpan = 'verse';
/** a plan for the verses after the one being read: the chapter was shown differently meanwhile */
let queued: PlanVerse[] | null = null;
let epoch = 0;
/** the chapter after this one is being fetched: the voice is silent meanwhile, and the reading is not over */
let loading = false;
/** a one-letter word's clip is playing in the verse: the voice is silent meanwhile, and the reading is not over */
let clipping = false;
/** the package held our speech at its last change */
let engineHad = false;
/** how the running reading was started, to start it again where it was (a Listen that a tutor's answer interrupted) */
let startedWith: StartOptions | null = null;
/** the Listen a tutor's answer is being read in front of: it goes on from `verse` when the answer has been read to its end */
let suspended: { options: StartOptions; verse: number } | null = null;
/** the Listen that last ran to its end by itself: its foot offers Play again */
let completed: string | null = null;
/** the chapter's recording this reading is heard in (src/speech/recordedVoice.ts, mw-82lb97i.3), or null when the phone's voice reads it */
let recording: ChapterTimings | null = null;
/** the last verse the recording plays to: at its end the reading goes on as at the end of a spoken verse (afterVerse) */
let recordedUntil = 0;
/** The lock screen shows this reading (src/speech/mediaSession.ts, mw-82lb97i.7): a recording is, or was just, its sound, and it goes on into the next chapter's recording. The phone's voice never has one. */
let lockScreen = false;
const listeners = new Set<() => void>();

const lockActions = {
  play: () => resumeReading(),
  pause: () => pauseReading(),
  stop: () => stopReading(),
  previous: () => void skipRecordedVerse(-1),
  next: () => void skipRecordedVerse(1),
};

/** Shows the reading on the lock screen, or takes it off: its title is the chapter being read, or the one it is crossing into. */
function syncLockScreen(): void {
  const to = state.crossing;
  const book = bookCode ?? planBook;
  const title = to ? titleOf(to.book, to.chapter) : book !== null ? titleOf(book, chapterNumber) : null;
  showSession(lockScreen && state.status !== 'idle' && title !== null ? { title, paused: state.status === 'paused' } : null, lockActions);
}

function set(next: ReadingState): void {
  state = next;
  syncLockScreen();
  listeners.forEach((l) => l());
}

function holdLockScreen(on: boolean): void {
  lockScreen = on;
  syncLockScreen();
}

export const getReading = (): ReadingState => state;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Tells `listener` each time the reading changes (the passage player, which hands the voice from one reference to the next, follows it). */
export const subscribeReading = subscribe;

export function useReading(): ReadingState {
  return useSyncExternalStore(subscribe, getReading, getReading);
}

/** The reading is over; `natural` when it ran to its end by itself (a Listen then offers Play again). */
function finish(my: number, natural = false): void {
  if (my !== epoch) return;
  epoch++;
  dropRecording();
  lockScreen = false;
  letSleep();
  suspended = null;
  completed = natural ? state.listen : null;
  set(IDLE);
  publish({ kind: 'reading-stopped' });
}

/** The package's speech changed: a Pause or Resume made on its bar moves the reading with it, and a reading it no longer holds is over (Stop on the
 * bar) or waits at its verse (a word took the voice). The end of a verse also empties the package for a moment, until the next verse is handed
 * to it, so that is judged only once this turn has run. */
function syncWithEngine(): void {
  const speech = getSpeech();
  const ours = speech.key === READ_KEY && speech.status !== 'idle';
  const had = engineHad;
  engineHad = ours;
  if (state.status === 'idle') return;
  if (recording) recordedWordSync(speech);
  if (ours) {
    if (speech.status === 'paused' && state.status === 'reading') {
      letSleep();
      set({ ...state, status: 'paused', onBar: true });
    } else if (speech.status === 'playing' && state.status === 'paused') {
      keepAwake();
      set({ ...state, status: 'reading', onBar: true });
    } else if (!state.onBar) {
      set({ ...state, onBar: true });
    }
    return;
  }
  if (!had) return;
  const my = epoch;
  queueMicrotask(() => {
    // a recorded reading never holds the package: its speech ending (a phone reading it took over from) is not its end
    if (my !== epoch || state.status === 'idle' || state.crossing || loading || clipping || recording) return;
    const now = getSpeech();
    if (now.status === 'idle') return finish(my);
    if (now.key === READ_KEY) return;
    // an answer is not waited at: when another speech takes the voice it is over
    if (state.answer !== null) return finish(my);
    letSleep();
    set({ ...state, status: 'paused', onBar: false });
  });
}

if (typeof window !== 'undefined') subscribeEngine(syncWithEngine);

/** The chapter after the one being read, when this reading may go into it: never for a verse, a section or a chapter; out of the book only for the Bible. */
function chapterAhead(): ChapterRef | null {
  if (bookCode === null || chapterNumber === 0 || (reach !== 'passage' && reach !== 'book' && reach !== 'bible')) return null;
  const next = neighbours(bookCode, chapterNumber).next;
  return next && (reach === 'bible' || next.book === bookCode) ? { book: next.book, chapter: next.chapter } : null;
}

/** The plan has no verse after `at`: go on into the next chapter when the span allows, else the reading is over. */
function cross(my: number): void {
  const to = chapterAhead();
  if (!to) return finish(my, true);
  loading = true;
  loadChapter(to.book, to.chapter).then(
    (c) => {
      loading = false;
      if (my !== epoch) return;
      // a Passage goes on only while the next chapter does not open with a section heading
      if (reach === 'passage' && c.verses[0]?.h) return finish(my, true);
      set({ ...state, verse: null, crossing: to, onBar: false });
      openReader(to);
    },
    () => {
      loading = false;
      finish(my);
    },
  );
}

function afterVerse(at: number, my: number): void {
  if (reach === 'verse') {
    // a tutor's answer read in front of a Listen is over: the Listen goes on from the verse it was at
    if (state.answer !== null && suspended) {
      const back = suspended;
      suspended = null;
      return startReading({ ...back.options, from: back.verse });
    }
    return finish(my, true);
  }
  const next = plan[at + 1];
  if (!next) return cross(my);
  if (reach === 'passage' && next.heading) return finish(my, true);
  readVerse(next.n, my);
}

/** The runs of a verse as the one text handed to the package: a run to a line, so the package cuts a sentence at the end of every run too. A Greek run
 * goes in its pronunciation's voice form, so the voice says what the respelling writes (mw-5r3p30.264). */
const textOf = (runs: Run[]): string => runs.map((r) => (r.language === 'greek' ? greekVoiceForm(r.text) : r.language === 'hebrew' ? hebrewVoiceForm(r.text) : r.text)).join('\n');

/** A verse's runs as what is played in turn. A Greek word of one letter (a lone ὁ, a one-letter syllable, the Ὃ and ὃ inside 1 John 1:1) is never handed to
 * the voice as it is, which would name the letter ('omicron'): the run is cut at it (loneLetterCuts, mw-5r3p30.448) and it is handed its pronunciation's
 * loneLetterForm ('οο', a line of its own, which his phone's Greek voice says as the sound; mw-5r3p30.421), or, on a phone with no Greek voice, its clip
 * plays there (mw-5r3p30.347) and the text on each side of it is a speech each. */
function piecesOf(runs: Run[]): Piece[] {
  const pieces: Piece[] = [];
  let lines: Run[] = [];
  const flush = () => {
    if (lines.length > 0) pieces.push({ text: textOf(lines) });
    lines = [];
  };
  for (const run of runs) {
    for (const cut of run.language === 'greek' ? loneLetterCuts(run.text) : [run]) {
      if ('clip' in cut) {
        flush();
        pieces.push(cut);
      } else lines.push({ ...run, text: cut.text });
    }
  }
  flush();
  return pieces;
}

/** Plays a verse's pieces in turn, then `done`. A clip cut off by another speech (a word he holds) leaves the reading waiting at its verse, as a word
 * that takes the voice does; one paused meanwhile waits for Resume, which reads the verse from its start. */
function playPieces(pieces: Piece[], my: number, done: () => void, slowly: boolean): void {
  playInTurn(pieces, {
    alive: () => my === epoch,
    done,
    failed: () => finish(my),
    text: (text, next) => speakText(text, READ_KEY, { onEnd: next, slowly }),
    clip: (url, next) => {
      clipping = true;
      const played = playLetterClip(url, (cut) => {
        clipping = false;
        if (my !== epoch || state.status !== 'reading') return;
        if (!cut) return next();
        if (state.answer !== null) return finish(my);
        letSleep();
        set({ ...state, status: 'paused', onBar: false });
      });
      if (!played) clipping = false;
      return played;
    },
  });
}

/** Verse `verse` (at `at` in the plan) is the one being read now: the state, the bus, and the next chapter's load when it is the plan's last. */
function markVerse(verse: number, at: number): void {
  if (state.verse !== verse) set({ ...state, verse });
  if (state.answer === null) publish({ kind: 'verse-reading', chapter: chapterNumber, verse });
  // the last verse starts the next chapter's load, so the voice need not wait for it
  const ahead = at === plan.length - 1 ? chapterAhead() : null;
  if (ahead) loadChapter(ahead.book, ahead.chapter).catch(() => {});
}

function readVerse(verse: number, my: number): void {
  if (my !== epoch) return;
  if (queued) {
    plan = queued;
    queued = null;
  }
  const at = plan.findIndex((v) => v.n === verse);
  const entry = plan[at];
  if (!entry) return finish(my);
  // the phone's voice reads from here: the lock screen has nothing of a recording to show
  if (lockScreen) holdLockScreen(false);
  markVerse(verse, at);
  if (entry.runs.length === 0) return afterVerse(at, my);
  playPieces(piecesOf(entry.runs), my, () => afterVerse(at, my), entry.runs.every((r) => r.slow));
}

// The recorded voice (mw-82lb97i.3, docs/read-aloud.md 'The recorded voice'): the state, the verses, the span and the crossing are the same as the phone's; only
// the sound is the recording's. It plays from the verse the reading starts at to the end of the last verse its span reads in this plan, and its end goes on as
// the end of a spoken verse does (afterVerse: the end of the reading, the Listen's Play again, or the crossing).

/** The plan's index of the last verse a reading from index `at` reads here: the verse itself for a verse, the verse before the next heading for a passage, else the plan's last. */
function lastIndexFrom(at: number): number {
  if (reach === 'verse') return at;
  if (reach === 'passage') {
    const heading = plan.findIndex((v, i) => i > at && v.heading);
    if (heading > 0) return heading - 1;
  }
  return plan.length - 1;
}

const englishOnly = (verses: PlanVerse[]): boolean => verses.every((v) => v.runs.every((r) => r.language === 'english'));

/** Stops the recording, if one plays, and forgets it. */
function dropRecording(): void {
  if (!recording) return;
  recording = null;
  stopRecording();
}

/** Plays the reading from verse `from` in `timings`; false when it cannot (the verse or the span's last verse is not in them), and the phone's voice reads instead. */
function playFromRecording(timings: ChapterTimings, from: number, my: number, title: boolean): boolean {
  const at = plan.findIndex((v) => v.n === from);
  const last = plan[lastIndexFrom(at)];
  const end = at >= 0 && last ? spanOf(timings, last.n)?.end : undefined;
  if (end === undefined || !englishOnly(plan.slice(at, lastIndexFrom(at) + 1))) return false;
  recording = timings;
  recordedUntil = last.n;
  const played = playRecording(
    timings,
    from,
    end,
    {
      verse: (n) => recordedVerse(n, my),
      reached: () => recordingReached(my),
      failed: () => recordingFailed(my),
    },
    title,
  );
  if (!played) {
    recording = null;
    return false;
  }
  // a play() that threw at once has already handed the verse to the phone's voice (recordingFailed)
  if (recording === timings) {
    lockScreen = true;
    set({ ...state, onBar: true, recorded: true });
    markVerse(from, at);
  }
  return true;
}

/** The recording reached verse `n`: it is the verse being read, and a plan that now has Greek or Hebrew in it (the weave turned on) is read by the phone's voice from here. */
function recordedVerse(n: number, my: number): void {
  if (my !== epoch || !recording || state.status !== 'reading' || n > recordedUntil) return;
  const now = state.verse === null ? -1 : plan.findIndex((v) => v.n === state.verse);
  const at = plan.findIndex((v) => v.n === n);
  if (at <= now) return;
  if (queued) {
    if (!englishOnly(queued.filter((v) => v.n >= n))) {
      dropRecording();
      set({ ...state, onBar: false, recorded: false });
      return readVerse(n, my);
    }
    plan = queued;
    queued = null;
  }
  markVerse(n, plan.findIndex((v) => v.n === n));
}

/** The recording reached the end of the last verse it plays: the reading goes on as after a spoken verse. */
function recordingReached(my: number): void {
  if (my !== epoch || !recording) return;
  recording = null;
  if (state.recorded) set({ ...state, onBar: false, recorded: false });
  if (queued) {
    plan = queued;
    queued = null;
  }
  const at = plan.findIndex((v) => v.n === recordedUntil);
  if (at < 0) return finish(my);
  if (state.verse !== recordedUntil) markVerse(recordedUntil, at);
  afterVerse(at, my);
}

/** The recording cannot be played (play() refused, the element's error, no sound in time): the phone's voice reads on from the verse in hand, never silence. */
function recordingFailed(my: number): void {
  if (my !== epoch || !recording) return;
  recording = null;
  lockScreen = false;
  set({ ...state, notice: RECORDING_FAILED_NOTICE, onBar: false, recorded: false });
  // a paused reading goes on in the phone's voice when he taps Play (resumeReading reads the verse it waits at)
  if (state.status === 'reading' && state.verse !== null) readVerse(state.verse, my);
}

function languageAhead(language: SpeechLanguage, from: number, all: boolean): boolean {
  const ahead = plan.filter((v) => (all ? v.n >= from : v.n === from));
  return ahead.some((v) => v.runs.some((r) => r.language === language));
}

/** The one line about a missing voice for the Greek or Hebrew the reading is about to read (from verse `from`, to the end when `all`), or null. */
function noVoiceNotice(from: number, all: boolean): string | null {
  if (hasGreekVoice() === false && languageAhead('greek', from, all)) return NO_GREEK_VOICE_NOTICE;
  if (hasVoice('hebrew') === false && languageAhead('hebrew', from, all)) return NO_HEBREW_VOICE_NOTICE;
  return null;
}

/** Starts reading at verse `from`: that verse only, or on as far as `span` says when `continuous` (the chapter's end when no
 * span is given; `book` is needed for a span that goes into another chapter). It takes the speech from whatever was being
 * read. Call it straight from the tap (docs/pwa-best-practices.md section 12). */
export interface StartOptions {
  chapter: number;
  plan: PlanVerse[];
  from: number;
  continuous: boolean;
  book?: string;
  /** the book `plan` is of when `book` is left out because the reading must not go on into the next chapter */
  inBook?: string;
  span?: ReadSpan;
  answer?: number;
  /** this reading is a Listen (listenKeyOf): an interruption from inside the app pauses it and it goes on by itself afterwards */
  listen?: string;
  /** the chapter's recording to hear it in (src/speech/recordedVoice.ts recordingFor decides at the tap), else the phone's voice reads it */
  recorded?: ChapterTimings;
  /** the line about the voice (src/speech/voiceDecision.ts): shown as the reading starts, unless a missing Greek or Hebrew voice has a line to say first */
  notice?: string;
}

export function startReading(options: StartOptions): void {
  epoch++;
  if (options.answer !== undefined) {
    // a tutor's answer read while a Listen is playing is read in front of it, and the Listen goes on after it
    if (state.answer === null && state.status === 'reading' && state.listen !== null && startedWith && state.verse !== null) suspended = { options: startedWith, verse: state.verse };
  } else suspended = null;
  startedWith = options.answer === undefined ? { ...options, notice: undefined } : startedWith;
  completed = null;
  resetInterrupts();
  dropRecording();
  lockScreen = false;
  if (getSpeech().status !== 'idle') engineStop();
  plan = options.plan;
  chapterNumber = options.chapter;
  bookCode = options.book ?? null;
  planBook = options.inBook ?? options.book ?? null;
  reach = options.continuous ? options.span ?? 'chapter' : 'verse';
  queued = null;
  const notice = noVoiceNotice(options.from, reach !== 'verse') ?? options.notice ?? null;
  set({ status: 'reading', verse: options.from, notice, answer: options.answer ?? null, crossing: null, onBar: false, recorded: false, listen: options.listen ?? null });
  keepAwake();
  // the narrator's announcement ('Audio Bible, John chapter one') belongs to a chapter, a book or the Bible read from its beginning, not to one verse or a pericope (mw-82lb97i.28)
  const title = reach !== 'verse' && reach !== 'passage' && options.plan[0]?.n === options.from;
  if (options.recorded && playFromRecording(options.recorded, options.from, epoch, title)) return;
  readVerse(options.from, epoch);
}

/** The Reader that opened the chapter a reading was going on into hands over that chapter's plan, and the voice starts its
 * first verse. Nothing happens unless this is the chapter the reading is waiting for (and not paused). */
export function continueReading(options: { book: string; chapter: number; plan: PlanVerse[]; recorded?: ChapterTimings; notice?: string }): void {
  const to = state.crossing;
  const first = options.plan[0];
  if (state.status !== 'reading' || !to || to.book !== options.book || to.chapter !== options.chapter) return;
  plan = options.plan;
  chapterNumber = options.chapter;
  bookCode = options.book;
  planBook = options.book;
  queued = null;
  if (!first) return finish(epoch);
  const notice = noVoiceNotice(first.n, true) ?? options.notice ?? state.notice;
  set({ ...state, verse: first.n, notice, crossing: null });
  if (options.recorded && playFromRecording(options.recorded, first.n, epoch, true)) return;
  readVerse(first.n, epoch);
}

/** Pauses the speech where it is: the package keeps the sentence reached, and its bar offers Resume. */
export function pauseReading(): void {
  if (state.status !== 'reading') return;
  // the recording is held at its second; the header's Play goes on from it
  if (recording) pauseRecording();
  else if (isSpeaking(READ_KEY)) return enginePause();
  // nothing is speaking: the reading waits at a chapter's door
  letSleep();
  set({ ...state, status: 'paused' });
}

/** Reads on from the sentence it was paused at; when the voice was taken meanwhile (a word said alone), from the start of the verse. */
export function resumeReading(): void {
  if (state.status !== 'paused' || (state.verse === null && !state.crossing)) return;
  if (recording && !state.crossing) {
    set({ ...state, status: 'reading' });
    keepAwake();
    return resumeRecording();
  }
  const speech = getSpeech();
  if (speech.key === READ_KEY && speech.status === 'paused') return engineResume();
  epoch++;
  set({ ...state, status: 'reading', onBar: false });
  keepAwake();
  // waiting at a chapter's door: the Reader that opens it carries on
  if (state.crossing || state.verse === null) return;
  readVerse(state.verse, epoch);
}

// An interruption from inside the app (a word said alone, the Hold to ask bar, the reading check's recording) pauses a Listen and gives it back when
// it ends (mw-5r3p30.130); any other reading is paused and waits for his Resume, as before. `held` counts the interruptions in force; `generation` makes
// the ends of an old Listen do nothing.
let held = 0;
let autoPaused = false;
let generation = 0;
let besideEnd: (() => void) | null = null;

function resetInterrupts(): void {
  held = 0;
  autoPaused = false;
  besideEnd = null;
  generation++;
}

function holdListen(): () => void {
  held++;
  autoPaused = true;
  const mine = generation;
  let ended = false;
  return () => {
    if (ended || mine !== generation) return;
    ended = true;
    held = Math.max(0, held - 1);
    if (held > 0 || !autoPaused) return;
    autoPaused = false;
    // a page that went hidden keeps the Listen paused: it waits for his Resume
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (state.listen !== null && state.status === 'paused') resumeReading();
  };
}

/** A Listen is interrupted from inside the app: it is paused now, and the function returned goes on with it once the interruption is over (call it
 * once). Null when what is going on is not a Listen, so the caller does what it did before; a Listen he paused himself stays paused. */
export function interruptListen(): (() => void) | null {
  if (state.listen === null || state.status === 'idle') return null;
  if (state.status === 'reading') pauseReading();
  else if (!autoPaused) return () => undefined;
  return holdListen();
}

/** The word said beside the reading is over: a Listen it paused goes on. */
function endBeside(): void {
  const end = besideEnd;
  besideEnd = null;
  end?.();
}

/** A word said alone while a RECORDED reading plays (the package holds no speech of the reading's, so greek.ts says the word on its own, not beside it) pauses the
 * recording at its second before the word is heard: a Listen goes on by itself when the word ends, any other reading waits for his Resume (docs/read-aloud.md). */
function interruptRecorded(): void {
  if (besideEnd) return;
  const resume = interruptListen();
  if (!resume) pauseReading();
  besideEnd = resume ?? (() => undefined);
}

/** The package's speech changed while a recording is the reading: a word (any speech that is not the reading's) is said, or it is over. A clip of a one-letter word
 * is a word beside the reading too (greek.ts playLoneLetter), watched by onBeside. */
function recordedWordSync(speech: ReturnType<typeof getSpeech>): void {
  if (speech.status !== 'idle' && isWordSpeech(speech.key)) interruptRecorded();
  else if (!besideNow()) endBeside();
}

/** A word said beside the reading (greek.ts speakBeside) pauses a Listen and is over when its last sentence ends. */
function onBeside(): void {
  const now = besideNow();
  if (now && recording && state.status !== 'idle') interruptRecorded();
  else if (now && now.interrupted && !besideEnd && state.listen !== null && state.status !== 'idle') besideEnd = holdListen();
  else if (!now && besideEnd && !(recording && isWordSpeech(getSpeech().key) && getSpeech().status !== 'idle')) endBeside();
}

if (typeof window !== 'undefined') subscribeBeside(onBeside);

/** The speaking bar's Restart on a Listen reads it again from its first verse (the package alone would restart the verse it is in). False when what is
 * being read is not a Listen: the bar then restarts the speech as it always did. */
export function restartListen(): boolean {
  // a reading of an answer (the passage player's too) never set startedWith: the bar restarts its speech
  if (state.listen === null || state.answer !== null || state.status === 'idle' || !startedWith) return false;
  const first = startedWith.plan[0];
  if (!first) return false;
  startReading({ ...startedWith, from: first.n });
  return true;
}

/** The speaking bar's Restart on a recorded reading: back to the start of the verse being read, and playing (a paused reading plays). False when no recording is the reading. */
export function restartRecorded(): boolean {
  if (!recording || state.status === 'idle' || state.verse === null) return false;
  if (!seekToVerse(state.verse)) return false;
  if (state.status === 'paused') {
    keepAwake();
    set({ ...state, status: 'reading' });
  }
  // play() again even when it plays: from the verse's start, with the span's end kept
  resumeRecording();
  return true;
}

/** The speaking bar's Previous verse (`by` -1) and Next verse (1) on a recorded reading, and the lock screen's previous and next track (mw-82lb97i.19, PROVISIONAL): the recording
 * seeks to the start of the verse before or after the one being read, however far into this one it is. A paused reading stays paused there, one in progress plays on from it, and the
 * verse mark follows at once. It stays inside the span: a verse reads only itself, a Listen of a section keeps to its section (the verse after its last, or before its first, is not
 * gone to), and the chapter's first verse has none before it. After the chapter's last verse a Play to End (Play to either) goes on into the next chapter's first verse, as it does
 * when the recording ends by itself (a paused one plays on there: the Reader opens the chapter only for a reading that plays), else nothing happens. False when it did nothing. */
export function skipRecordedVerse(by: -1 | 1): boolean {
  if (!recording || state.status === 'idle' || state.verse === null || state.crossing || state.answer !== null || loading || clipping) return false;
  const at = plan.findIndex((v) => v.n === state.verse);
  if (at < 0) return false;
  const last = plan.findIndex((v) => v.n === recordedUntil);
  let first = 0;
  if (reach === 'verse') first = last;
  else if (reach === 'passage') {
    for (let i = at; i > 0 && first === 0; i--) if (plan[i].heading) first = i;
  }
  const to = at + by;
  if (to > last && by === 1 && at === plan.length - 1 && (reach === 'book' || reach === 'bible') && chapterAhead()) {
    const my = epoch;
    if (state.status === 'paused') {
      keepAwake();
      set({ ...state, status: 'reading' });
    }
    stopRecording();
    recordingReached(my);
    return true;
  }
  if (to < first || to > last) return false;
  let target = plan[to];
  if (queued) {
    // the weave turned on since: a verse that would no longer be English is not skipped to, the reading goes on as it was
    const ahead = queued.filter((v) => v.n >= target.n);
    if (!englishOnly(ahead)) return false;
    plan = queued;
    queued = null;
    target = plan.find((v) => v.n === target.n) ?? target;
  }
  if (!seekToVerse(target.n)) return false;
  markVerse(target.n, plan.findIndex((v) => v.n === target.n));
  return true;
}

// A page that hides does NOT pause a recording (mw-82lb97i.7, PROVISIONAL; mw-82lb97i.3's rule is taken back for it): a recording goes on with the screen locked, as an audio Bible does,
// and the lock screen offers Play and Pause (src/speech/mediaSession.ts). The phone's voice is paused by voice-kit when the page hides, as before. A Listen an interruption paused
// while the page is hidden still waits for his Resume (holdListen's end).

/** The key of the Listen on a verse or a passage of a chapter (`unit` is data/passage.ts unitId). */
export const listenKeyOf = (book: string, chapter: number, unit: string): string => `${book}.${chapter}.${unit}`;

/** The key of the Listen that last ran to its end by itself, or null: how a reading's owner tells its end from a Stop. */
export const listenCompletedNow = (): string | null => completed;

/** The Listen that last ran to its end by itself, or null (it offers Play again). */
export function useListenCompleted(): string | null {
  return useSyncExternalStore(subscribe, () => completed, () => completed);
}

/** Stops for good. */
export function stopReading(): void {
  if (state.status === 'idle') {
    if (completed !== null) {
      completed = null;
      listeners.forEach((l) => l());
    }
    return;
  }
  epoch++;
  dropRecording();
  lockScreen = false;
  letSleep();
  suspended = null;
  completed = null;
  resetInterrupts();
  set(IDLE);
  publish({ kind: 'reading-stopped' });
  if (isSpeaking(READ_KEY)) engineStop();
  else if (clipping) stopLetterClip();
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

/** Whether the chapter reading going on or paused is of this chapter (a Reader that opens another chapter ends a paused one). */
export function isReadingOf(book: string, chapter: number): boolean {
  return state.status !== 'idle' && state.answer === null && chapterNumber === chapter && planBook === book;
}

/** Stops the speech of the Bible talk answer being read, and only that: the chapter's own reading is left alone. A response that waits
 * for his return (tutorWaiting.ts) is kept: this is for a screen that closes, and the bar over the Reader still offers it (mw-5r3p30.323). */
export function stopAnswerSpeech(): void {
  if (state.answer !== null) stopReading();
}

/** Ends the answer for good: its speech, and the response that waits (a new question, a tap on the response, New talk). */
export function stopAnswer(): void {
  dropWaiting();
  stopAnswerSpeech();
}
