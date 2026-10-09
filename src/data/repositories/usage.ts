// src/data/repositories/usage.ts — how often he used each part of the app (src/tips/ reads it): a row per local day and name, with a
// count. Names are event kinds, 'screen:<route>' and 'chapter-changed', never text he typed or a verse. Also the counts of the
// stores the tips summary needs, so the summary never reaches Dexie itself.
import { db, type UsageRow } from '../db';

export type { UsageRow };

/** The local day of `ms` as 'YYYY-MM-DD'. */
export function dayOf(ms: number): string {
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** Adds one to today's count for `name`. */
export async function recordUsage(name: string, now = Date.now()): Promise<void> {
  const day = dayOf(now);
  const key = `${day}|${name}`;
  await db.transaction('rw', db.usage, async () => {
    const row = await db.usage.get(key);
    await db.usage.put({ key, day, name, count: (row?.count ?? 0) + 1 });
  });
}

export const listUsage = (): Promise<UsageRow[]> => db.usage.toArray();

/** How much he has done, by count of rows. */
export interface UsageCounts {
  wordsLearning: number;
  wordsSolid: number;
  talks: number;
  asks: number;
  quizAnswers: number;
  drillAnswers: number;
  readings: number;
  grammarKnown: number;
}

export async function usageCounts(): Promise<UsageCounts> {
  const [wordsLearning, wordsSolid, talks, asks, quizAnswers, drillAnswers, readings, grammarKnown] = await Promise.all([
    db.words.where('state').equals('learning').count(),
    db.words.where('state').equals('solid').count(),
    db.talks.count(),
    db.answers.count(),
    db.results.count(),
    db.drills.count(),
    db.readings.count(),
    db.grammarKnown.count(),
  ]);
  return { wordsLearning, wordsSolid, talks, asks, quizAnswers, drillAnswers, readings, grammarKnown };
}

/** Every saved setting by its store key (a row exists only once he has chosen). */
export async function savedSettings(): Promise<Record<string, string>> {
  return Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value]));
}
