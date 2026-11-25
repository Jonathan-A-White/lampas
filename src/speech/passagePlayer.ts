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
import { lampasNumber } from '../reader/septuagint';
import { readViewSettings, settingsFor } from '../reader/useViewSettings';
import { wovenOf } from '../reader/useWoven';
import { clearPlace, labelOf, savePlace } from './passagePlace';
import { getReading, listenCompletedNow, pauseReading, planOf, resumeReading, startReading, stopReading, subscribeReading, type PlanVerse } from './readAloud';
import { spokenReference } from './spokenReference';

/** A reference to read: its heading ('Hebrews 7:1-3') and its place when Lampas holds the text: what src/markdown/verseLinks.ts gives (null for an Old Testament reference the tutor named, until its card holds it too). */
export interface PassageRef {
  heading: string;
  held: HeldPlace | null;
  /** read whole chapters, from `held.chapter` through this one (a chapter alone, or 'Judges 1-5'), instead of the verses `held` names (mw-fnvjof.18) */
  through?: number;
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
/** Offline only on the browser's word; a passage that failed to fetch while online could not be fetched (mw-lcv9z3g.4). */
const OFFLINE = (heading: string): string => (navigator.onLine === false ? `${heading}: not on this phone yet, and you are offline` : `${heading}: could not be fetched`);

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
/** where this play() keeps its place (passagePlace.ts), or null: the key of the verse list or of the reference */
let placeKey: string | null = null;
/** the verse the first reference is to be read from, instead of its start: the place he left it at (mw-5r3p30.1236) */
let startVerse: number | null = null;
/** the verse numbers Lampas shows the verses of the reference being read by, by plan number (a Septuagint reference's differ from the plan's) */
let shownNow = new Map<number, number>();
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

/** Each chapter after the first of a reference read through, its verses numbered from here up so that one plan holds them all (read aloud finds a verse by its number). */
const CHAPTER_STEP = 1000;

/** The verses `ref` names, as read aloud reads them in the Reader's view and weave now: the verses of one chapter, or, for a reference read through, every verse of each chapter. */
async function planOfReference(ref: PassageRef, held: HeldPlace): Promise<ReferencePlan> {
  if (ref.through === undefined || ref.through <= held.chapter) return planOfChapter(held, ref.through !== undefined);
  const chapters = Array.from({ length: ref.through - held.chapter + 1 }, (_, i) => held.chapter + i);
  const plans = await Promise.all(chapters.map((chapter) => planOfChapter({ ...held, chapter }, true)));
  return {
    plan: plans.flatMap(({ plan }, k) => plan.map((v) => ({ ...v, n: k * CHAPTER_STEP + v.n }))),
    shown: new Map(plans.flatMap(({ shown }, k) => [...shown].map(([n, shownN]): [number, number] => [k * CHAPTER_STEP + n, k * CHAPTER_STEP + shownN]))),
  };
}

/** A reference's plan, and for each of its verses (by plan number) the verse number Lampas shows it by: a Septuagint verse's Greek number is not the verse he knows it by (Greek 9:22 is Psalm 10:1). */
interface ReferencePlan {
  plan: PlanVerse[];
  shown: Map<number, number>;
}

async function planOfChapter(held: HeldPlace, whole: boolean): Promise<ReferencePlan> {
  const [chapter, saved] = await Promise.all([loadChapter(held.book, held.chapter), readViewSettings()]);
  const settings = settingsFor(saved, chapter);
  const woven = wovenOf(chapter, settings);
  // a reference is in Lampas's verses: a Septuagint chapter's are its `ref`s (Greek 9:22 is Psalm 10:1), not the Greek numbers (mw-u2w5klk.18)
  const wanted = chapter.verses.map((v, i) => ({ v, i })).filter(({ v }) => whole || (lampasNumber(chapter, v) >= held.first && lampasNumber(chapter, v) <= held.last));
  const plan = planOf(
    wanted.map(({ v }) => v),
    settings.view,
    woven ? wanted.map(({ i }) => woven[i] ?? null) : null,
    sourceLanguage(chapter),
  );
  return { plan, shown: new Map(wanted.map(({ v }) => [v.n, lampasNumber(chapter, v)])) };
}

/** One line said in English, as a reading of its own. */
function say(line: string): void {
  startReading({ chapter: 0, plan: [{ n: PASSAGE_ID, runs: [{ text: spokenReference(line), language: 'english' }] }], from: PASSAGE_ID, continuous: false, answer: PASSAGE_ID, listen: KEY });
}

/** The reference's heading as the first entry of its plan, said in English before the verses. It is a plan entry of its own (verse 0, which no chapter has), so
 * the heading and the verses are one reading and one Listen: the heading's end is not the reference's end, and Pause, Resume and Stop reach it as they reach a verse. */
const HEADING_N = 0;

function begin(ref: PassageRef, { plan, shown }: ReferencePlan, held: HeldPlace): void {
  if (!plan[0]) return say(OFFLINE(ref.heading));
  shownNow = shown;
  const heading: PlanVerse = { n: HEADING_N, runs: [{ text: spokenReference(ref.heading), language: 'english' }] };
  // read on from the verse he left off at when it is still in the plan (the view or weave may have changed it since), without saying the heading again
  const from = startVerse !== null && ref === queue[0] && at === 0 && plan.some((v) => v.n === startVerse) ? startVerse : HEADING_N;
  startVerse = null;
  startReading({ chapter: held.chapter, plan: [heading, ...plan], from, continuous: true, inBook: held.book, span: 'chapter', answer: PASSAGE_ID, listen: KEY });
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
  if (!ref) {
    if (placeKey) clearPlace(placeKey);
    return set(IDLE);
  }
  set({ state: gapPaused ? 'paused' : 'playing', current: ref });
  const { held } = ref;
  if (!held) return startOrHold(mine, () => say(skippedLine(ref.heading)));
  planOfReference(ref, held).then(
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
    // the next reference is where he is now, at its start; past the last one the list or reference is done
    const next = queue[at];
    if (placeKey) {
      if (next) savePlace(placeKey, { heading: next.heading, verse: 0, label: next.heading });
      else clearPlace(placeKey);
    }
    // the reading that just ended finishes announcing itself first
    queueMicrotask(() => readNext(mine));
    return;
  }
  if (reading.listen !== KEY) return end();
  handedOff = false;
  keepPlace(reading.verse);
  set({ state: reading.status === 'paused' ? 'paused' : 'playing', current: player.current });
}

/** The verse of the reference being read is where he is: kept, for Resume (a reading of the heading is its verse 0, a line said alone has none). */
function keepPlace(verse: number | null): void {
  const ref = player.current;
  if (!placeKey || !ref?.held || verse === null || verse < 0) return;
  savePlace(placeKey, { heading: ref.heading, verse, label: labelOf(ref.heading, ref.held.chapter, ref.through !== undefined, shownNow.get(verse) ?? verse) });
}

function end(): void {
  turn++;
  queue = [];
  gapPaused = false;
  startNext = null;
  handedOff = false;
  startVerse = null;
  placeKey = null;
  shownNow = new Map();
  set(IDLE);
}

subscribeReading(onReading);

export interface PlayOptions {
  /** the verse (in the reading's plan: passagePlace.ts) the first reference is read from, instead of its start */
  verse?: number;
  /** the key (passagePlace.ts listKey, refKey) the place is kept under as the voice reads, so a later Play can resume there; the end of `refs` clears it */
  place?: string;
}

/** Reads `refs` aloud in order, from the first; whatever was being read gives way. Call it straight from the tap. */
export function playPassages(refs: PassageRef[], options: PlayOptions = {}): void {
  turn++;
  queue = refs;
  placeKey = options.place ?? null;
  startVerse = options.verse !== undefined && options.verse > HEADING_N ? options.verse : null;
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
