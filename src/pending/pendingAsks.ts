// src/pending/pendingAsks.ts — what each question to the tutor is doing, kept in localStorage so that a question is never lost (mw-5r3p30.602, folding mw-5r3p30.439 and .441):
// one line per question that is sending, waiting for its answer or failed, until its answer is stored or he asks again. The Verse view's Ask (src/useAsks.ts, key 'ask:<ref>') and the
// Bible talk (src/useTalk.ts, key 'talk:<ref>') both keep their AskState here instead of in component state, so leaving the page, a screen that goes away or a reload of the page
// (Android lets go of a page in the background) leaves the question, its wait or its failure and Retry as they were. A question that had gone (`sent`: the grist's id and place)
// is waited for again, never sent a second time (AskOptions.resume, src/services/tutor.ts). localStorage itself is the truth (the snapshot is parsed again when it changes),
// so a test that clears it clears this too.
import { useSyncExternalStore } from 'react';
import type { TalkFocus } from '../services/talk';
import type { TutorFailure } from '../services/tutor';

/** The grist that went: its id and its place in the backend's sequence (src/services/mill.ts SentGrist). */
export interface SentRef {
  txid: string;
  seq: number;
}

/** What a question is doing right now. `sent` is set once the grist went (and stays on a failure of the link, so Retry waits for that grist's answer); `focus` is what a Bible talk's message
 * was asked about, kept for the answer and for Retry; `spoken` is set when the question was sent as spoken (src/speech/spoken.ts forgets the words once they are sent, so Retry and a
 * page that is back carry it here, mw-5r3p30.333). A failed line keeps `startedAt` too (when the message was first asked), so a Retry of a first turn whose grist went stores it with that time and the talk's name,
 * `<ref>@<that time>`, stays the same (mw-5r3p30.724). */
export type AskState =
  | { phase: 'sending' | 'waiting'; question: string; startedAt: number; sent?: SentRef; focus?: TalkFocus; spoken?: true }
  | { phase: 'failed'; question: string; failure: TutorFailure; detail: string; startedAt?: number; sent?: SentRef; focus?: TalkFocus; spoken?: true };

export type Pending = Record<string, AskState>;

/** The key a Bible talk's message is kept under (the conversation's ref, src/data/repositories/talks.ts). */
export const talkKey = (ref: string): string => `talk:${ref}`;

const STORAGE_KEY = 'lampas.pendingAsks';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isSent = (value: unknown): value is SentRef => isObject(value) && typeof value.txid === 'string' && typeof value.seq === 'number';

/** One line as it was kept; anything that does not read is left out, as a question this app did not write. */
function readState(value: unknown): AskState | undefined {
  if (!isObject(value) || typeof value.question !== 'string') return undefined;
  const sent = isSent(value.sent) ? { sent: value.sent } : {};
  const focus = isObject(value.focus) ? { focus: value.focus as unknown as TalkFocus } : {};
  const spoken = value.spoken === true ? { spoken: true as const } : {};
  if (value.phase === 'sending' || value.phase === 'waiting') {
    return typeof value.startedAt === 'number' ? { phase: value.phase, question: value.question, startedAt: value.startedAt, ...sent, ...focus, ...spoken } : undefined;
  }
  if (value.phase === 'failed' && typeof value.failure === 'string' && typeof value.detail === 'string') {
    const startedAt = typeof value.startedAt === 'number' ? { startedAt: value.startedAt } : {};
    return { phase: 'failed', question: value.question, failure: value.failure as TutorFailure, detail: value.detail, ...startedAt, ...sent, ...focus, ...spoken };
  }
  return undefined;
}

function parse(raw: string | null): Pending {
  if (!raw) return {};
  try {
    const body: unknown = JSON.parse(raw);
    if (!isObject(body)) return {};
    const lines: Pending = {};
    for (const [key, value] of Object.entries(body)) {
      const state = readState(value);
      if (state) lines[key] = state;
    }
    return lines;
  } catch {
    return {};
  }
}

const storage = (): Storage | undefined => (typeof window === 'undefined' ? undefined : window.localStorage);

let cachedRaw: string | null | undefined;
let cached: Pending = {};
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Every question kept, by key; the same object until something changes. */
export function pendingAll(): Pending {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    // a phone that refuses storage keeps nothing across a reload: the questions still work while the page lives
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

/** What the question under `key` is doing, or undefined when it has no line. */
export const pendingOf = (key: string): AskState | undefined => pendingAll()[key];

/** Keeps `state` under `key`, or drops the line when it is undefined. */
export function setPending(key: string, state: AskState | undefined): void {
  const next = { ...pendingAll() };
  if (state) next[key] = state;
  else delete next[key];
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // the phone's storage is full or refused: the line lives in memory until the page goes
    cachedRaw = undefined;
    cached = next;
  }
  emit();
}

/** The lines of every question kept, redrawn when one changes. */
export function usePendingAsks(): Pending {
  return useSyncExternalStore(subscribe, pendingAll, () => ({}));
}

// The questions being waited for by a live screen now. A line in 'sending' or 'waiting' that is not here belongs to a page that went (or a screen that went away): it is waited for again (resume).
const running = new Set<string>();

/** Whether a screen of this page is waiting for the question under `key` now. */
export const isRunning = (key: string): boolean => running.has(key);

/** A screen starts waiting for the question under `key`; call the returned function when it stops. */
export function startRunning(key: string): () => void {
  running.add(key);
  return () => void running.delete(key);
}

/** The question under `key` was left waiting by a page or a screen that is gone, and nobody waits for it now. */
export function isOrphan(key: string): boolean {
  const state = pendingOf(key);
  return (state?.phase === 'sending' || state?.phase === 'waiting') && !running.has(key);
}

/** What a Retry on this line does: wait for the grist that went when the link failed after it went (`sent`), else send the question again. */
export const resumeOf = (state: AskState | undefined): SentRef | undefined => state?.sent;
