// src/review/moreItems.ts — after a Review round, more items on the ideas he missed, from the mill (mw-hqd5bz.36, docs/grammar.md 'More items from the mill'). The Governor's words: "after each
// drill round, a grist asks for more items on your weakest ideas, saved so the next round starts at once." So nothing here is waited on: the round's end card is drawn first, this runs after it,
// asks for nothing when the phone is offline, holds no key or no licence, or another ask is still out, and a round draws its questions from what is kept (kinds.ts GRAMMAR.draw), never from the mill.
// The Drill it screens serve the same kept items (src/DrillItScreen.tsx, src/PlanDrillScreen.tsx); the request carries the questions he has been asked (src/data/repositories/seenItems.ts).
import { DEVICE_KEY_STORAGE_KEY } from '../config';
import type { Chapter } from '../data/chapter';
import { buildDrillItemsRequest, checkedItems, DRILL_ITEMS_KIND, isDrillItemsAnswer, weakestMissed } from '../data/grammar/fetchedItems';
import type { GrammarIdea } from '../data/grammar/ladder';
import { mulberry32 } from '../data/quiz';
import { listSeenOf, saveFetchedItems } from '../data/repositories';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { currentLicence } from '../services/licenceNow';
import { askGrind } from '../services/tutor';
import { gradedVersesOf, loadPassage } from './kinds';

/** What asking for more items did. */
export type MoreItems =
  /** nothing he missed can be asked more of (a letter or a sound is drilled from items the app makes) */
  | 'nothing'
  /** another ask is still out: at most one is in flight */
  | 'busy'
  | 'offline'
  | 'no-key'
  | 'no-licence'
  /** the passage has no verse that uses the ideas */
  | 'no-verses'
  /** the grist went out and its items were kept (0 or more passed the check) */
  | { kept: number }
  /** the grist could not be sent or came back unreadable */
  | 'failed';

export interface MoreItemsOptions {
  /** the device key's bytes; the phone's own by default */
  key?: Uint8Array;
  storage?: Storage;
  /** the passage the verses are drawn from; the goal's chapters (or the open one) by default */
  passage?: Chapter[];
}

let running: Promise<MoreItems> | null = null;

/** Resolves when no ask is out: a screen that must not show a half-done state, and a test, wait on it. */
export const whenIdle = async (): Promise<void> => {
  await running;
};

/** The phone's key, or undefined when it holds none yet (asking never makes one). */
function keyIfAny(options: MoreItemsOptions): Uint8Array | undefined {
  if (options.key) return options.key;
  if (!(options.storage ?? window.localStorage).getItem(DEVICE_KEY_STORAGE_KEY)) return undefined;
  try {
    return getDeviceKeyBytes(options.storage);
  } catch {
    return undefined;
  }
}

/**
 * Asks the mill for more items on the weakest of `missed` (one id for each miss of the round), and keeps what comes back. Never throws and never needs waiting for: the caller starts it and goes on.
 * The resolved value says what became of it.
 */
export function askForMoreItems(missed: readonly string[], options: MoreItemsOptions = {}): Promise<MoreItems> {
  const ideas = weakestMissed(missed);
  if (ideas.length === 0) return Promise.resolve('nothing');
  if (running) return Promise.resolve('busy');
  // set before anything is awaited, so a second ask in the same moment finds this one
  running = ask(ideas, missed, options).finally(() => {
    running = null;
  });
  return running;
}

async function ask(ideas: GrammarIdea[], missed: readonly string[], options: MoreItemsOptions): Promise<MoreItems> {
  if (navigator.onLine === false) return 'offline';
  const key = keyIfAny(options);
  if (!key) return 'no-key';
  if (currentLicence() !== 'licensed') return 'no-licence';
  try {
    const seed = Math.floor(Math.random() * 0x100000000);
    const passage = options.passage ?? (await loadPassage(mulberry32(seed)));
    const graded = await gradedVersesOf(passage).catch(() => undefined);
    const counts = new Map<string, number>();
    for (const id of missed) counts.set(id, (counts.get(id) ?? 0) + 1);
    // the questions he has been asked on these ideas go with the request, so the mill writes none of them (mw-indx1x6.1)
    const seen = await listSeenOf(ideas.map((idea) => idea.id)).catch(() => new Map());
    const request = buildDrillItemsRequest(ideas, counts, passage, graded, seen);
    if (!request) return 'no-verses';
    const answer = await askGrind(DRILL_ITEMS_KIND, request, isDrillItemsAnswer, { key, untimed: true });
    // the request may have had no room for all he has seen: the answer is checked against the whole list
    const kept = checkedItems(answer, request, passage, [...seen.values()].flat());
    if (kept.length > 0) await saveFetchedItems(kept);
    return { kept: kept.length };
  } catch (error) {
    console.warn('could not fetch more drill items', error);
    return 'failed';
  }
}
