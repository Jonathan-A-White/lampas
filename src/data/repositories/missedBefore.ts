// src/data/repositories/missedBefore.ts — whether he missed an idea before (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea'). The kit's confirm rule (learn-kit/fresh recordAnswer) is told this by the app, which reads its own
// rows: the idea's schedule row has a lapse, or a wrong answer among its last answers, that he has not made good by confirming it since. What he had confirmed is kept under 'confirmed' in the settings store
// ({idea id: {lapses, at}}, outside the settings registry), so a miss he has made good is not a miss before. A wrong answer in a drill (Drill it, Prove it, the short drill) is written to no row of the idea
// (the short drill's goes to its plan's row, at Done), so it is kept apart, under 'drillMissed' ({idea id: when of the last}, mw-74h98vg.3), when it is made, and counts the same way. A repository owns its transactions.
import { db } from '../db';
import { IDEA_KIND } from '../grammar/ladder';
import { reviewsOf } from './reviews';

const CONFIRMED_KEY = 'confirmed';
const DRILL_MISSED_KEY = 'drillMissed';

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

function parseMissed(value: unknown): Record<string, number> {
  if (typeof value !== 'string') return {};
  try {
    const map: unknown = JSON.parse(value);
    return typeof map === 'object' && map !== null && !Array.isArray(map) ? (map as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Notes a wrong answer in a drill on the idea, at the moment it is made: the idea is a miss before from then until he confirms it. Local only: nothing waits on the network. */
export async function noteDrillMiss(ideaId: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const all = parseMissed((await db.settings.get(DRILL_MISSED_KEY))?.value);
    await db.settings.put({ key: DRILL_MISSED_KEY, value: JSON.stringify({ ...all, [ideaId]: now }) });
  });
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
 * Whether he missed this idea before: its row has a lapse, or a wrong answer among its last answers (reviews.ts keeps both), or he answered a drill's question on it wrong (noteDrillMiss), that he has not
 * made good by confirming it since. An idea with no row and no drill miss was never missed.
 */
export async function missedBefore(ideaId: string): Promise<boolean> {
  const row = (await reviewsOf([{ kind: IDEA_KIND, id: ideaId }]))[0];
  const done = parseConfirmed((await db.settings.get(CONFIRMED_KEY))?.value)[ideaId];
  const drilled = parseMissed((await db.settings.get(DRILL_MISSED_KEY))?.value)[ideaId];
  if (typeof drilled === 'number' && drilled > (done?.at ?? 0)) return true;
  if (!row) return false;
  if (!done) return row.lapses > 0 || (row.recent ?? []).some((a) => !a.right);
  return row.lapses > done.lapses || (row.recent ?? []).some((a) => !a.right && a.when > done.at);
}
