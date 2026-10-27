// src/data/repositories/toConfirm.ts — the ideas 'to confirm' (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea'). An idea he missed before and then answered right is marked: it counts as known
// only when a question he has not been asked before on it is right. The mark is a JSON list of idea ids in the settings store under 'toConfirm' (outside the settings registry, as fetchedItems is); what he
// had confirmed is kept beside it under 'confirmed' ({idea id: {lapses, at}}), so a miss he has made good is not a miss before. A repository owns its transactions.
import { db } from '../db';
import { IDEA_KIND } from '../grammar/ladder';
import { reviewsOf } from './reviews';

const KEY = 'toConfirm';
const CONFIRMED_KEY = 'confirmed';

interface Confirmed {
  /** the idea's lapses when he last confirmed it */
  lapses: number;
  /** when */
  at: number;
}

function parseIds(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function parseConfirmed(value: unknown): Record<string, Confirmed> {
  if (typeof value !== 'string') return {};
  try {
    const map: unknown = JSON.parse(value);
    return typeof map === 'object' && map !== null && !Array.isArray(map) ? (map as Record<string, Confirmed>) : {};
  } catch {
    return {};
  }
}

/** The ideas marked 'to confirm'. */
export async function listToConfirm(): Promise<string[]> {
  return parseIds((await db.settings.get(KEY))?.value);
}

/** Whether this idea is marked 'to confirm'. */
export async function isToConfirm(ideaId: string): Promise<boolean> {
  return (await listToConfirm()).includes(ideaId);
}

/** Marks an idea 'to confirm' (one that is marked already stays so). */
export async function markToConfirm(ideaId: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const ids = parseIds((await db.settings.get(KEY))?.value);
    if (!ids.includes(ideaId)) await db.settings.put({ key: KEY, value: JSON.stringify([...ids, ideaId]) });
  });
}

/** Takes the mark off an idea. `confirmed` says a fresh question was right: the idea's lapses and the time are kept, and what he missed until now is no longer a miss before. */
export async function clearToConfirm(ideaId: string, confirmed = false, now = Date.now()): Promise<void> {
  const row = confirmed ? (await reviewsOf([{ kind: IDEA_KIND, id: ideaId }]))[0] : undefined;
  await db.transaction('rw', db.settings, async () => {
    const ids = parseIds((await db.settings.get(KEY))?.value);
    if (ids.includes(ideaId)) await db.settings.put({ key: KEY, value: JSON.stringify(ids.filter((id) => id !== ideaId)) });
    if (confirmed) {
      const all = parseConfirmed((await db.settings.get(CONFIRMED_KEY))?.value);
      await db.settings.put({ key: CONFIRMED_KEY, value: JSON.stringify({ ...all, [ideaId]: { lapses: row?.lapses ?? 0, at: now } }) });
    }
  });
}

/**
 * Whether he missed this idea before: its row has a lapse, or a wrong answer among its last answers (reviews.ts keeps both), that he has not made good by confirming it since.
 * An idea with no row was never missed.
 */
export async function missedBefore(ideaId: string): Promise<boolean> {
  const row = (await reviewsOf([{ kind: IDEA_KIND, id: ideaId }]))[0];
  if (!row) return false;
  const done = parseConfirmed((await db.settings.get(CONFIRMED_KEY))?.value)[ideaId];
  if (!done) return row.lapses > 0 || (row.recent ?? []).some((a) => !a.right);
  return row.lapses > done.lapses || (row.recent ?? []).some((a) => !a.right && a.when > done.at);
}
