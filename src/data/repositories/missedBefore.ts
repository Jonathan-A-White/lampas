// src/data/repositories/missedBefore.ts — whether he missed an idea before (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea'). The kit's confirm rule (learn-kit/fresh recordAnswer) is told this by the app, which reads its own
// rows: the idea's schedule row has a lapse, or a wrong answer among its last answers, that he has not made good by confirming it since. What he had confirmed is kept under 'confirmed' in the settings store
// ({idea id: {lapses, at}}, outside the settings registry), so a miss he has made good is not a miss before. A repository owns its transactions.
import { db } from '../db';
import { IDEA_KIND } from '../grammar/ladder';
import { reviewsOf } from './reviews';

const CONFIRMED_KEY = 'confirmed';

interface Confirmed {
  /** the idea's lapses when he last confirmed it */
  lapses: number;
  /** when */
  at: number;
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

/** Notes that a fresh question was right on the idea: its lapses and the time are kept, and what he missed until now is no longer a miss before. */
export async function markConfirmed(ideaId: string, now = Date.now()): Promise<void> {
  const row = (await reviewsOf([{ kind: IDEA_KIND, id: ideaId }]))[0];
  await db.transaction('rw', db.settings, async () => {
    const all = parseConfirmed((await db.settings.get(CONFIRMED_KEY))?.value);
    await db.settings.put({ key: CONFIRMED_KEY, value: JSON.stringify({ ...all, [ideaId]: { lapses: row?.lapses ?? 0, at: now } }) });
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
