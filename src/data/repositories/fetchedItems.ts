// src/data/repositories/fetchedItems.ts — the drill items the mill wrote, kept until a round uses them (mw-hqd5bz.36, docs/grammar.md 'More items from the mill'). The keeping is learn-kit/fresh's stock (mw-74h98vg.1):
// `fetchedStock` serves the oldest kept item of an idea once, never one he has been asked, and tops itself up in the background through the mill call src/review/moreItems.ts connects. The kept list of an idea is
// one JSON list of questions in the settings store (freshStore.ts keptStore, 'fetchedItems.<idea id>'; no table, outside the settings registry so only a finished fetch writes it).
import { createStock, isFresh } from 'learn-kit/fresh';
import { db } from '../db';
import { MAX_KEPT } from '../grammar/fetchedItems';
import { ideaOf } from '../grammar/ladder';
import type { GrammarQuestion } from '../grammar/questions';
import { KEPT_PREFIX, freshStore, keptStore, parseKept, questionKey, saveKept } from './freshStore';

/** The mill call the stock tops up with: the repository cannot reach the review layer, so src/review/moreItems.ts connects it when it loads. It resolves none until then. */
type Ask = (ideaId: string, request: { count: number; avoid: string[] }) => Promise<GrammarQuestion[]>;
let ask: Ask = async () => [];
export const connectMill = (next: Ask): void => {
  ask = next;
};

const keyOf = (q: GrammarQuestion): string => questionKey(q);

/** The ask-ahead stock of questions he has not been asked: kept in the settings store (cap MAX_KEPT), checked against the ledger of what he has been asked. */
export const fetchedStock = createStock<GrammarQuestion>({ ask: (ideaId, request) => ask(ideaId, request), keyOf, store: keptStore, fresh: freshStore, cap: MAX_KEPT });

/** The questions the mill wrote that were taken to be asked this session (the kit's key of each): a fresh question is one of these, whatever screen asks it (mw-indx1x6.2). */
const served = new Set<string>();

const servedKey = (q: GrammarQuestion): string => `${q.ideaId}|${keyOf(q)}`;

/** Whether this question is one the mill wrote and a take handed out (not a built one). */
export const isFreshQuestion = (q: GrammarQuestion): boolean => served.has(servedKey(q));

/** Keeps these items after the ones already kept for their ideas; an idea keeps its newest MAX_KEPT. */
export const saveFetchedItems = saveKept;

/** How many items are kept for an idea. */
export const countFetchedItems = (ideaId: string): Promise<number> => fetchedStock.count(ideaId);

/**
 * Takes the oldest kept item of each of these ideas, so it is served once: the ideas that have none are left out of the map. One read and write, never a wait on the network.
 * A kept item he has been asked already (the same prompt on the same verse) is not served; it is dropped. Each take starts the stock's top-up when it runs low.
 */
export async function takeFetchedItems(ideaIds: readonly string[]): Promise<Map<string, GrammarQuestion>> {
  const taken = new Map<string, GrammarQuestion>();
  for (const id of new Set(ideaIds)) {
    const item = await fetchedStock.take(id);
    if (!item) continue;
    taken.set(id, item);
    served.add(servedKey(item));
  }
  return taken;
}

/** The kept items of an idea that he has not been asked, the oldest first; nothing is taken. */
export async function listUnseenFetched(ideaId: string): Promise<GrammarQuestion[]> {
  const kept = await keptStore.get(ideaId);
  const fresh = await Promise.all(kept.map((q) => isFresh(freshStore, ideaId, keyOf(q))));
  return kept.filter((_, i) => fresh[i]);
}

/** Takes every kept item of an idea that he has not been asked (Prove it, when the built questions he has not seen are too few to prove an idea on); they are used up. */
export async function takeAllFetched(ideaId: string): Promise<GrammarQuestion[]> {
  const items: GrammarQuestion[] = [];
  for (let item = await fetchedStock.take(ideaId); item; item = await fetchedStock.take(ideaId)) items.push(item);
  for (const q of items) served.add(servedKey(q));
  return items;
}

/** The ids of the ideas that have kept items, the lower rung first (a stored id the ladder no longer has is left out). */
export async function listFetchedIdeas(): Promise<string[]> {
  const rows = await db.settings.where('key').startsWith(KEPT_PREFIX).toArray();
  return rows
    .filter((r) => parseKept(r.value).length > 0)
    .flatMap((r) => {
      try {
        return [ideaOf(r.key.slice(KEPT_PREFIX.length))];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.rung - b.rung)
    .map((idea) => idea.id);
}
