// src/data/repositories/ladder.ts — where he is on the reading ladder of each language (docs/reading-ladder.md, src/data/readingLadder.ts). The Dexie
// `ladder` table keeps, per language, the verse the ladder last opened for him ('showing') and the verses he skipped for now. The place itself is not kept: it is
// the first verse of the list he has not read well, worked out from the reading history (readings.ts), so the two can never disagree. A repository owns its transactions.
import { db, type LadderRow } from '../db';

export type { LadderRow };

const emptyRow = (lang: string): LadderRow => ({ lang, showing: null, skipped: [] });

/** The row of a language: nothing shown and nothing skipped until the ladder is first used. */
export async function getLadderRow(lang: string): Promise<LadderRow> {
  return (await db.ladder.get(lang)) ?? emptyRow(lang);
}

/** The verse the ladder has opened (its panel says 'Verse N of M'), or null when he leaves the ladder. */
export async function setLadderShowing(lang: string, ref: string | null): Promise<void> {
  await db.transaction('rw', db.ladder, async () => {
    const row = await getLadderRow(lang);
    await db.ladder.put({ ...row, showing: ref });
  });
}

/** Skips a verse for now: it is remembered with the time, and again skipped later it starts its wait afresh. */
export async function skipLadderVerse(lang: string, ref: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.ladder, async () => {
    const row = await getLadderRow(lang);
    await db.ladder.put({ ...row, skipped: [...row.skipped.filter((s) => s.ref !== ref), { ref, at: now }] });
  });
}

/** Every verse he has read well in `lang`, with the time of the latest such reading. */
export async function listWellRead(lang: string): Promise<Map<string, number>> {
  const readings = await db.readingHistory.where('[lang+at]').between([lang, -Infinity], [lang, Infinity]).toArray();
  const wellAt = new Map<string, number>();
  for (const reading of readings) {
    if (reading.verdict === 'well-read' && reading.at >= (wellAt.get(reading.ref) ?? -Infinity)) wellAt.set(reading.ref, reading.at);
  }
  return wellAt;
}
