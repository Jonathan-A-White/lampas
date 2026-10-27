// src/speech/passagePlayer.ts — the one passage player (mw-9q8wp1.4): reads a list of Bible references aloud, one after the other, over the app's read aloud
// (readAloud.ts startReading), in the language and weave the Reader reads in now (readViewSettings: English, Greek, or the Weave's mix). The reference pop-up's
// Play (src/markdown/ReferenceCard.tsx) gives it one reference; a list's Play all gives it the list. Lampas holds no Old Testament text, so an Old Testament
// reference is announced '<reference>: skipping, no Old Testament present' and the player goes on to the next; a New Testament one is announced by its heading
// ('John 10:27', in English, as written in full) before its verses, as the first entry of the same reading (mw-9q8wp1.9). Pause, Resume and Stop are the reading's own
// (the package's bar and these agree: a Pause on either moves both). Each reference is a reading of an answer (answer: PASSAGE_ID), so the Reader's highlight and
// its 'Reading verse N' line stay out of it, and a Listen of its own key, whose natural end (readAloud.ts listenCompletedNow) is how the player knows to go on
// rather than being stopped: the reading's end by itself goes to the next reference, a Stop or another speech taking the voice ends the player.
import type { HeldPlace } from '../markdown/verseLinks';
import { loadChapter, sourceLanguage } from '../data/chapter';
import { readViewSettings, settingsFor } from '../reader/useViewSettings';
import { wovenOf } from '../reader/useWoven';
import { getReading, listenCompletedNow, pauseReading, planOf, resumeReading, startReading, stopReading, subscribeReading, type PlanVerse } from './readAloud';

/** A reference to read: its heading ('Hebrews 7:1-3') and its place when Lampas holds the text: what src/markdown/verseLinks.ts gives (null for an Old Testament reference the tutor named, until its card holds it too). */
export interface PassageRef {
  heading: string;
  held: HeldPlace | null;
}

export type PassageState = 'idle' | 'playing' | 'paused';

export interface PassagePlayer {
  state: PassageState;
  /** the reference being read (or paused at), null when idle */
  current: PassageRef | null;
}

/** The id the reading carries: below zero, so it is never an answer's or a verdict's (readAloud.ts startAnswer). */
const PASSAGE_ID = -7;
const KEY = 'passage-player';

export const skippedLine = (heading: string): string => `${heading}: skipping, no Old Testament present`;
const OFFLINE = (heading: string): string => `${heading}: not on this phone yet, and you are offline`;

const IDLE: PassagePlayer = { state: 'idle', current: null };
let player: PassagePlayer = IDLE;
let queue: PassageRef[] = [];
let at = 0;
/** which play() this is: a reference fetched for an older one is not read */
let turn = 0;
/** Pause was pressed between two references, with no reading of ours live to pause: the next reference waits (`startNext`) until Resume */
let gapPaused = false;
let startNext: (() => void) | null = null;
/** the reading that ended by itself has been handed on to the next reference, whose own reading has not begun */
let handedOff = false;
const listeners = new Set<(state: PassageState, current: PassageRef | null) => void>();

export const getPassagePlayer = (): PassagePlayer => player;

/** Tells `listener` each time the player's state or reference changes; returns the way to stop telling. */
export function onPassageChange(listener: (state: PassageState, current: PassageRef | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: PassagePlayer): void {
  if (next.state === player.state && next.current === player.current) return;
  player = next;
  [...listeners].forEach((l) => l(next.state, next.current));
}

/** The verses `held` names, as read aloud reads them in the Reader's view and weave now. */
async function planOfReference(held: HeldPlace): Promise<PlanVerse[]> {
  const [chapter, saved] = await Promise.all([loadChapter(held.book, held.chapter), readViewSettings()]);
  const settings = settingsFor(saved, chapter);
  const woven = wovenOf(chapter, settings);
  const wanted = chapter.verses.map((v, i) => ({ v, i })).filter(({ v }) => v.n >= held.first && v.n <= held.last);
  return planOf(
    wanted.map(({ v }) => v),
    settings.view,
    woven ? wanted.map(({ i }) => woven[i] ?? null) : null,
    sourceLanguage(chapter),
  );
}

/** One line said in English, as a reading of its own. */
function say(line: string): void {
  startReading({ chapter: 0, plan: [{ n: PASSAGE_ID, runs: [{ text: line, language: 'english' }] }], from: PASSAGE_ID, continuous: false, answer: PASSAGE_ID, listen: KEY });
}

/** The reference's heading as the first entry of its plan, said in English before the verses. It is a plan entry of its own (verse 0, which no chapter has), so
 * the heading and the verses are one reading and one Listen: the heading's end is not the reference's end, and Pause, Resume and Stop reach it as they reach a verse. */
const HEADING_N = 0;

function begin(ref: PassageRef, plan: PlanVerse[], held: HeldPlace): void {
  if (!plan[0]) return say(OFFLINE(ref.heading));
  const heading: PlanVerse = { n: HEADING_N, runs: [{ text: ref.heading, language: 'english' }] };
  startReading({ chapter: held.chapter, plan: [heading, ...plan], from: HEADING_N, continuous: true, inBook: held.book, span: 'chapter', answer: PASSAGE_ID, listen: KEY });
}

/** Starts a reference's reading now, or, when Pause was pressed in the wait before it, when Resume is. */
function startOrHold(mine: number, start: () => void): void {
  if (mine !== turn) return;
  if (gapPaused) startNext = start;
  else start();
}

function readNext(mine: number): void {
  if (mine !== turn) return;
  const ref = queue[at];
  if (!ref) return set(IDLE);
  set({ state: gapPaused ? 'paused' : 'playing', current: ref });
  const { held } = ref;
  if (!held) return startOrHold(mine, () => say(skippedLine(ref.heading)));
  planOfReference(held).then(
    (plan) => startOrHold(mine, () => begin(ref, plan, held)),
    () => startOrHold(mine, () => say(OFFLINE(ref.heading))),
  );
}

/** The reading changed: follow it. Its natural end goes on to the next reference; anything else that ends it ends the player. */
function onReading(): void {
  if (player.state === 'idle') return;
  const reading = getReading();
  if (reading.status === 'idle') {
    // between two references there is a moment with no reading: it is not an end, and the next one is already being fetched
    if (listenCompletedNow() !== KEY) return end();
    // already handed off to the next reference, which is being fetched: a second notice of the same end does not skip it
    if (handedOff) return;
    handedOff = true;
    const mine = turn;
    at++;
    // the reading that just ended finishes announcing itself first
    queueMicrotask(() => readNext(mine));
    return;
  }
  if (reading.listen !== KEY) return end();
  handedOff = false;
  set({ state: reading.status === 'paused' ? 'paused' : 'playing', current: player.current });
}

function end(): void {
  turn++;
  queue = [];
  gapPaused = false;
  startNext = null;
  handedOff = false;
  set(IDLE);
}

subscribeReading(onReading);

/** Reads `refs` aloud in order, from the first; whatever was being read gives way. Call it straight from the tap. */
export function playPassages(refs: PassageRef[]): void {
  turn++;
  queue = refs;
  at = 0;
  gapPaused = false;
  startNext = null;
  handedOff = false;
  readNext(turn);
}

/** Pauses where the voice is; the reading goes on from that sentence on resumePassage. Between two references there is no reading to pause: the
 * player pauses on the next one, which is not spoken until Resume (then from its start). */
export function pausePassage(): void {
  if (player.state !== 'playing') return;
  if (getReading().listen === KEY && getReading().status !== 'idle') return pauseReading();
  const next = queue[at];
  if (!next) return;
  gapPaused = true;
  set({ state: 'paused', current: next });
}

export function resumePassage(): void {
  if (player.state !== 'paused') return;
  if (!gapPaused) return resumeReading();
  gapPaused = false;
  set({ state: 'playing', current: player.current });
  const start = startNext;
  startNext = null;
  start?.();
}

/** Stops for good: the speech is cancelled and the rest of the list is not read. Another reading in progress is left alone. */
export function stopPassage(): void {
  if (player.state === 'idle') return;
  end();
  if (getReading().listen === KEY) stopReading();
}
