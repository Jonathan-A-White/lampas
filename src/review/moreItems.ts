// src/review/moreItems.ts — after a Review round, more items on the ideas he missed, from the mill (mw-hqd5bz.36, docs/grammar.md 'More items from the mill'). The Governor's words: "after each
// drill round, a grist asks for more items on your weakest ideas, saved so the next round starts at once." So nothing here is waited on: the round's end card is drawn first, this runs after it,
// asks for nothing when the phone is offline, holds no key or no licence, or another ask is still out, and a round draws its questions from what is kept (kinds.ts GRAMMAR.draw), never from the mill.
// The keeping and the rule are learn-kit/fresh's (mw-74h98vg.1): the stock of src/data/repositories/fetchedItems.ts asks through `millAsk` below, one ask in flight for the whole stock, and the triggers here
// map to the kit's: a drill, a Review round or Prove it opening on an idea is `opened` (keepStocked), a kept item served is `served` (the stock's take), a right answer after a miss is `rightAfterMiss`
// (confirm.ts). What stays Lampas's: the mill call with the ideas of a round batched in one grist, the answer check, which ideas the mill is asked about, and the passage.
import { DEVICE_KEY_STORAGE_KEY } from '../config';
import type { Chapter } from '../data/chapter';
import { buildDrillItemsRequest, checkedItems, DRILL_ITEMS_KIND, isDrillItemsAnswer, isFetchable, weakestMissed } from '../data/grammar/fetchedItems';
import type { GrammarIdea } from '../data/grammar/ladder';
import { ideaOfAny as ideaOf, ladderLangOf } from '../data/grammar/ladders';
import type { GrammarQuestion } from '../data/grammar/questions';
import { mulberry32 } from '../data/quiz';
import { connectMill, countFetchedItems, fetchedStock, isToConfirm, listSeen, listSeenOf, listUnseenFetched, saveFetchedItems } from '../data/repositories';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { currentLicence } from '../services/licenceNow';
import { askGrind } from '../services/tutor';
import { loadHebrewPassage } from '../data/repositories/reviewPassage';
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

/** The ask the stock is running for askForMoreItems: the ideas of a round (up to MAX_IDEAS in one grist), how it is to be made, and what became of it. */
interface Batch {
  ideas: GrammarIdea[];
  missed: readonly string[];
  options: MoreItemsOptions;
  outcome?: MoreItems;
  /** the items kept for the batch's other ideas (the stock keeps the first idea's) */
  beside: number;
}

let batch: Batch | null = null;
/** The counts of stock (keepStocked) that have not decided yet whether to ask. */
const counting = new Set<Promise<void>>();

/** Resolves when no ask is out and no count of stock is still deciding whether to ask: a screen that must not show a half-done state, and a test, wait on it. */
export const whenIdle = async (): Promise<void> => {
  while (counting.size > 0) await Promise.all([...counting]);
  await fetchedStock.settle();
  // a count that finished may have started an ask
  if (counting.size > 0 || fetchedStock.inFlight()) await whenIdle();
};

/** Fewer kept items than this that he has not been asked, on an idea he may be proved on or asked to confirm, start an ask ahead (the kit's STOCK_LOW_WATER, PROVISIONAL, mw-indx1x6.2). */
export const LOW_KEPT = 2;

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
 * The resolved value says what became of it. It is the stock's top-up with the ideas of the round batched into one grist; at most one ask is in flight.
 */
export async function askForMoreItems(missed: readonly string[], options: MoreItemsOptions = {}): Promise<MoreItems> {
  const ideas = weakestMissed(missed);
  if (ideas.length === 0) return 'nothing';
  if (fetchedStock.inFlight()) return 'busy';
  // set before anything is awaited, so a second ask in the same moment finds this one
  const mine: Batch = { ideas, missed, options, beside: 0 };
  batch = mine;
  try {
    const kept = await fetchedStock.topUp(ideas[0].id);
    return mine.outcome ?? { kept: kept + mine.beside };
  } finally {
    if (batch === mine) batch = null;
  }
}

const fetchable = (id: string): boolean => {
  try {
    return isFetchable(ideaOf(id));
  } catch {
    return false;
  }
};

/** The ideas the mill is asked about on its own (a drill opening, a kept item served): he has been asked questions on it, it is marked to confirm or the mill wrote items for it. An idea he has never been asked is left alone (every built question is new to him). */
async function askable(ideaId: string): Promise<boolean> {
  if (!fetchable(ideaId)) return false;
  return (await isToConfirm(ideaId)) || (await countFetchedItems(ideaId)) > 0 || (await listSeen(ideaId)).length > 0;
}

/** The stock's ask: the grist for the batch askForMoreItems set, else for the one idea; [] (and the reason in the batch) when the phone cannot ask or the grist fails. */
async function millAsk(ideaId: string): Promise<GrammarQuestion[]> {
  const mine = batch;
  if (!mine) {
    // started by the stock itself (an item served, a drill opened): only for an idea worth asking ahead for
    if (!(await askable(ideaId))) return [];
    const ideas = weakestMissed([ideaId]);
    if (ideas.length === 0) return [];
    return askMill(ideas, [ideaId], {}, undefined);
  }
  return askMill(mine.ideas, mine.missed, mine.options, mine);
}

async function askMill(ideas: GrammarIdea[], missed: readonly string[], options: MoreItemsOptions, mine: Batch | undefined): Promise<GrammarQuestion[]> {
  const stop = (outcome: MoreItems): GrammarQuestion[] => {
    if (mine) mine.outcome = outcome;
    return [];
  };
  if (navigator.onLine === false) return stop('offline');
  const key = keyIfAny(options);
  if (!key) return stop('no-key');
  if (currentLicence() !== 'licensed') return stop('no-licence');
  try {
    const seed = Math.floor(Math.random() * 0x100000000);
    // a Hebrew idea is asked about Hebrew verses; the graded order is the Greek words' (gradedVerses.ts), so a Hebrew request takes the passage's order
    const hebrew = ladderLangOf(ideas[0].id) === 'hbo';
    const passage = options.passage ?? (hebrew ? await loadHebrewPassage(mulberry32(seed)) : await loadPassage(mulberry32(seed)));
    const graded = hebrew ? undefined : await gradedVersesOf(passage).catch(() => undefined);
    const counts = new Map<string, number>();
    for (const id of missed) counts.set(id, (counts.get(id) ?? 0) + 1);
    // the questions he has been asked on these ideas go with the request, so the mill writes none of them (mw-indx1x6.1)
    const seen = await listSeenOf(ideas.map((idea) => idea.id)).catch(() => new Map());
    const request = buildDrillItemsRequest(ideas, counts, passage, graded, seen);
    if (!request) return stop('no-verses');
    const answer = await askGrind(DRILL_ITEMS_KIND, request, isDrillItemsAnswer, { key, untimed: true });
    // the request may have had no room for all he has seen: the answer is checked against the whole list
    const checked = checkedItems(answer, request, passage, [...seen.values()].flat());
    // the stock keeps the first idea's; the batch's other ideas are kept beside it
    const others = checked.filter((q) => q.ideaId !== ideas[0].id);
    if (others.length > 0) await saveFetchedItems(others);
    if (mine) mine.beside = others.length;
    return checked.filter((q) => q.ideaId === ideas[0].id);
  } catch (error) {
    console.warn('could not fetch more drill items', error);
    return stop('failed');
  }
}

connectMill((ideaId) => millAsk(ideaId));

/**
 * Asks the mill ahead of need (mw-indx1x6.2; the kit's `opened`): for the ideas of `ideaIds` that he may be proved on or asked to confirm (he has been asked questions on it, it is marked to confirm or the mill wrote items for it) and whose kept items he has not been asked are fewer than LOW_KEPT, in the background, so Prove it and the confirm rarely wait. Called when a drill, a Review round or Prove it
 * opens on an idea (a kept item served starts the same in the stock). Never throws, never waits for the mill: it resolves once the stock is counted. An idea he has never been asked is left alone (every built question
 * is new to him). Nothing is asked while another ask is out, offline, with no key or no licence (askForMoreItems).
 */
export function keepStocked(ideaIds: readonly string[], options: MoreItemsOptions = {}): Promise<void> {
  const counted = count(ideaIds, options).finally(() => counting.delete(counted));
  counting.add(counted);
  return counted;
}

async function count(ideaIds: readonly string[], options: MoreItemsOptions): Promise<void> {
  if (fetchedStock.inFlight()) return;
  try {
    const low: string[] = [];
    for (const id of new Set(ideaIds)) {
      // an id the ladder no longer has asks nothing
      if (!fetchable(id)) continue;
      if ((await listUnseenFetched(id)).length >= LOW_KEPT) continue;
      if (await askable(id)) low.push(id);
    }
    if (low.length > 0) void askForMoreItems(low, options);
  } catch (error) {
    console.warn('could not count the kept drill items', error);
  }
}
