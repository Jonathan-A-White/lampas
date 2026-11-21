// src/handsFree/wakeLog.ts — what Hands-free heard, kept in memory for the makers (mw-5r3p30.1231). 'Hey Lampas' was not heard on his car's Bluetooth after
// mw-5r3p30.1213, and nobody could see why on his phone (he cannot open chrome://inspect while driving). So the wake (wakeInput.ts) and the session (session.ts)
// write here, line by line, the last LOG_KEEP_MS (two minutes) of it:
//  - every input the phone lists: its name, its group and its id, the last two as short hashes (shortHash), never the phone's own ids;
//  - each input tried, and what it gave: its peak and mean level and how many samples, and whether it was left as silent;
//  - the input it settled on, since when, and the track's settings (its rate, echo cancellation, noise suppression);
//  - every REPORT_MS (10 s), on the input it listens on: the peak and mean of what it heard and the wake model's highest score (WakeScorer);
//  - each wake heard, and the session's states (a failure, a page that needs a touch).
// The list of inputs and where it listens now are kept past the two minutes: the rest means nothing without them. Times are UTC. Each line also goes to the console
// as 'Hands-free: <line>'. Settings, Hands-free 'Send what Hands-free heard' and a three-finger long press send it (sendLog.ts); nothing else reads it.
import { createDetector, loadModel, type WakeModel } from 'voice-kit/wake';

/** How long a line is kept. */
export const LOG_KEEP_MS = 120_000;

/** How often what the input hears is told. */
export const REPORT_MS = 10_000;

/** How long three fingers are held for a send (sendLog.ts): longer than the three-finger tap's 400 ms (voice-kit TAP_WITHIN_MS), so a tap is never a send. */
export const HOLD_MS = 1000;

/** For tests: the clock of the lines, how often a report is made, how long the long press is. */
export const wakeLogSeam: { now?: () => number; reportMs?: number; holdMs?: number } = {};

const now = (): number => (wakeLogSeam.now ?? Date.now)();
export const reportMs = (): number => wakeLogSeam.reportMs ?? REPORT_MS;
export const holdMs = (): number => wakeLogSeam.holdMs ?? HOLD_MS;

interface Entry {
  at: number;
  text: string;
}

let entries: Entry[] = [];
/** The lines of the latest list of inputs. */
let inputsNow: Entry[] = [];
/** Where the wake listens now, or null when it listens nowhere. */
let settledNow: Entry | null = null;

/** Forgets every line (tests; a reload does the same). */
export function forgetWakeLog(): void {
  entries = [];
  inputsNow = [];
  settledNow = null;
}

function prune(): void {
  const from = now() - LOG_KEEP_MS;
  if (entries.length > 0 && entries[0].at < from) entries = entries.filter((entry) => entry.at >= from);
}

function add(text: string): Entry {
  const entry = { at: now(), text };
  entries.push(entry);
  prune();
  console.info(`Hands-free: ${text}`);
  return entry;
}

/** Writes a line. */
export function logWake(text: string): void {
  add(text);
}

/** The time of day of `at`, UTC. */
export const clockOf = (at: number): string => new Date(at).toISOString().slice(11, 19);

/** The time of day now, on the log's clock. */
export const timeNow = (): string => clockOf(now());

/** The lines kept, oldest first, each with its time: the latest list of inputs and where it listens now come first when they are older than the rest. */
export function wakeLogLines(): string[] {
  prune();
  const kept = new Set(entries);
  const earlier = [...inputsNow, ...(settledNow ? [settledNow] : [])].filter((entry) => !kept.has(entry));
  return [...earlier, ...entries].map((entry) => `${clockOf(entry.at)} ${entry.text}`);
}

/** Where it listens now, for the summary of a send; null when nowhere. */
export function listeningNow(): string | null {
  return settledNow?.text ?? null;
}

/** A short hash of an id (FNV-1a, 32 bits, 8 hex digits): the same id is the same hash, and the id itself is never sent. */
export function shortHash(id: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** The pseudo-inputs, whose ids name no device and are the same on every phone: shown as they are. */
const PLAIN_IDS = new Set(['default', 'communications']);

const idText = (id: string): string => (id === '' ? '(none)' : PLAIN_IDS.has(id) ? id : shortHash(id));

/** An input as the log names it: its label in quotes, or the name the wake gave it. */
export const named = (label: string): string => `"${label}"`;

/** Writes the list of inputs, when it is not the list written last. */
export function logInputs(devices: readonly { deviceId: string; label: string; groupId?: string }[]): void {
  const lines = devices.map((device) => `input ${named(device.label)} group ${device.groupId ? shortHash(device.groupId) : '(none)'} id ${idText(device.deviceId)}`);
  const head = `the phone lists ${devices.length} ${devices.length === 1 ? 'input' : 'inputs'}`;
  const all = [head, ...lines];
  if (all.join('\n') === inputsNow.map((entry) => entry.text).join('\n')) return;
  inputsNow = all.map((text) => add(text));
}

/** Writes where the wake listens now. */
export function logSettled(text: string): void {
  settledNow = add(text);
}

/** Writes that it listens there no more. */
export function logUnsettled(text: string): void {
  settledNow = null;
  add(text);
}

// --- levels ----------------------------------------------------------------------------------------------------------------------------------------

/** What an input gave over a time: its loudest sample, its mean level and how many samples. */
export interface Levels {
  peak: number;
  mean: number;
  samples: number;
}

/** Counts the levels of the samples it is given, until it is read. */
export class Meter {
  private peak = 0;
  private sum = 0;
  private count = 0;

  add(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      const level = Math.abs(samples[i]);
      if (level > this.peak) this.peak = level;
      this.sum += level;
    }
    this.count += samples.length;
  }

  /** The levels so far; it starts again. */
  take(): Levels {
    const levels = { peak: this.peak, mean: this.count > 0 ? this.sum / this.count : 0, samples: this.count };
    this.peak = 0;
    this.sum = 0;
    this.count = 0;
    return levels;
  }
}

/** A level in dB below full scale, or 'silence' for nothing at all. */
const dbfs = (level: number): string => (level > 0 ? `${(20 * Math.log10(level)).toFixed(1)} dBFS` : 'silence');

export const levelsText = (levels: Levels): string => `peak ${dbfs(levels.peak)}, mean ${dbfs(levels.mean)}, ${levels.samples} samples`;

// --- the wake model's score -----------------------------------------------------------------------------------------------------------------------

/** Scores what an input hears with the wake model, as the wake does: its best score since it was last asked. */
export interface WakeScorer {
  push(samples: Float32Array): void;
  /** The highest score since the last call, or null when nothing was scored. */
  best(): Promise<number | null>;
  stop(): void;
}

/** Scores on this thread: the tests' (jsdom has no Worker). */
function scoreHere(model: WakeModel, inputRate: number): WakeScorer {
  const detector = createDetector(loadModel(model), { inputRate, keepScores: true });
  return {
    push: (samples) => void detector.push(samples),
    best: () => {
      const scores = detector.scores;
      const best = scores.length > 0 ? Math.max(...scores) : null;
      scores.length = 0;
      return Promise.resolve(best);
    },
    stop: () => undefined,
  };
}

/** Scores in a worker of its own (wakeScoreWorker.ts), so the page never waits on it: the same work the wake's own worker does, a second time. */
function scoreInWorker(model: WakeModel, inputRate: number): WakeScorer {
  const worker = new Worker(new URL('./wakeScoreWorker.ts', import.meta.url), { type: 'module' });
  const waiting: ((best: number | null) => void)[] = [];
  worker.onmessage = (event: MessageEvent<{ type: 'best'; best: number | null }>) => waiting.shift()?.(event.data.best);
  worker.onerror = () => waiting.splice(0).forEach((resolve) => resolve(null));
  worker.postMessage({ type: 'init', model, inputRate });
  let stopped = false;
  return {
    push: (samples) => {
      if (!stopped) worker.postMessage({ type: 'audio', samples });
    },
    best: () =>
      stopped
        ? Promise.resolve(null)
        : new Promise((resolve) => {
            waiting.push(resolve);
            worker.postMessage({ type: 'best' });
          }),
    stop: () => {
      stopped = true;
      worker.terminate();
      waiting.splice(0).forEach((resolve) => resolve(null));
    },
  };
}

/** A scorer of the wake model on what an input hears at `inputRate`; null when it cannot be made (the model will not load). */
export function startScorer(model: WakeModel, inputRate: number): WakeScorer | null {
  try {
    return typeof Worker === 'function' ? scoreInWorker(model, inputRate) : scoreHere(model, inputRate);
  } catch {
    return null;
  }
}

export const scoreText = (best: number | null): string => (best === null ? 'best score not measured' : `best score ${best.toFixed(3)}`);
