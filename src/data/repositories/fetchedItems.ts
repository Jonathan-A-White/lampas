// src/data/repositories/fetchedItems.ts — the drill items the mill wrote, kept until a round uses them (mw-hqd5bz.36, docs/grammar.md 'More items from the mill'). One JSON list of questions
// per idea in the settings store under 'fetchedItems.<idea id>' (no table, outside the settings registry so only a finished fetch writes it). A repository owns its transactions.
import { db } from '../db';
import { MAX_KEPT, isKeptQuestion, seenKey } from '../grammar/fetchedItems';
import { ideaOf } from '../grammar/ladder';
import type { GrammarQuestion } from '../grammar/questions';
import { SEEN_PREFIX, parseSeen } from './seenItems';

const PREFIX = 'fetchedItems.';

/** The questions a settings value holds; a value that is not a list, or an item that is not a drawable question, is left out. */
function parse(value: unknown): GrammarQuestion[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list) ? list.filter(isKeptQuestion) : [];
  } catch {
    return [];
  }
}

/** Keeps these items after the ones already kept for their ideas; an idea keeps its newest MAX_KEPT. */
export async function saveFetchedItems(items: readonly GrammarQuestion[]): Promise<void> {
  const ideas = [...new Set(items.map((q) => q.ideaId))];
  await db.transaction('rw', db.settings, async () => {
    for (const id of ideas) {
      const kept = parse((await db.settings.get(PREFIX + id))?.value);
      const next = [...kept, ...items.filter((q) => q.ideaId === id)].slice(-MAX_KEPT);
      await db.settings.put({ key: PREFIX + id, value: JSON.stringify(next) });
    }
  });
}

/** How many items are kept for an idea. */
export async function countFetchedItems(ideaId: string): Promise<number> {
  return parse((await db.settings.get(PREFIX + ideaId))?.value).length;
}

/**
 * Takes the oldest kept item of each of these ideas, so it is served once: the ideas that have none are left out of the map. One read and write, never a wait on the network.
 * A kept item he has been asked already (seenItems.ts: the same prompt on the same verse) is not served; it is dropped.
 */
export async function takeFetchedItems(ideaIds: readonly string[]): Promise<Map<string, GrammarQuestion>> {
  const taken = new Map<string, GrammarQuestion>();
  if (ideaIds.length === 0) return taken;
  await db.transaction('rw', db.settings, async () => {
    for (const id of new Set(ideaIds)) {
      const kept = parse((await db.settings.get(PREFIX + id))?.value);
      const seen = new Set(parseSeen((await db.settings.get(SEEN_PREFIX + id))?.value).map(seenKey));
      const [first, ...rest] = kept.filter((q) => !seen.has(seenKey({ prompt: q.prompt, ref: q.ref ?? '' })));
      if (!first) {
        if (kept.length > 0) await db.settings.delete(PREFIX + id);
        continue;
      }
      taken.set(id, first);
      if (rest.length > 0) await db.settings.put({ key: PREFIX + id, value: JSON.stringify(rest) });
      else await db.settings.delete(PREFIX + id);
    }
  });
  return taken;
}

/** The ids of the ideas that have kept items, the lower rung first (a stored id the ladder no longer has is left out). */
export async function listFetchedIdeas(): Promise<string[]> {
  const rows = await db.settings.where('key').startsWith(PREFIX).toArray();
  return rows
    .filter((r) => parse(r.value).length > 0)
    .flatMap((r) => {
      try {
        return [ideaOf(r.key.slice(PREFIX.length))];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.rung - b.rung)
    .map((idea) => idea.id);
}
