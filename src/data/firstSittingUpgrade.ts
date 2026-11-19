// src/data/firstSittingUpgrade.ts — the v35 upgrade (mw-5r3p30.1200): before it, climbing a verse from nothing in one sitting ('Next step' each time) priced the verse at the gap of the step it
// moved to, so a verse learned today (step 7 of 7) was due in 90 days. advanceStep (repositories/memorize.ts) now holds such a climb to tomorrow; this brings the rows the old rule
// already wrote to the same: a verse row whose recalls are all on the day of its lastWhen (the learning day), with no rights counted and a due date a step's gap out, is due the day
// after lastWhen. A row he has recalled on another day is left alone. Pure of the repositories (db.ts imports it, and they import db).
import type { Transaction } from 'dexie';
import { DAY, gapOf } from './schedule';
import { startOfDay } from './startOfDay';
import type { RecallRow, Review } from './db';

const VERSE = 'verse';

/** Whether this row is one the old rule priced at the gap of the step its learning climb ended on, given the days of its recalls. */
export function priceOfOldClimb(row: Review, recallDays: ReadonlySet<number>): boolean {
  if (row.kind !== VERSE || row.rights !== 0 || row.step < 1) return false;
  if (row.due !== row.lastWhen + gapOf(row.step) || row.due <= row.lastWhen + DAY) return false;
  const learningDay = startOfDay(row.lastWhen);
  return [...recallDays].every((day) => day === learningDay);
}

/** The v35 upgrade: see the top of this file. Returns how many rows it changed. */
export async function holdFirstSittings(tx: Transaction): Promise<number> {
  const reviews = tx.table<Review>('reviews');
  const rows = await reviews.where('kind').equals(VERSE).toArray();
  const days = new Map<string, Set<number>>();
  for (const recall of await tx.table<RecallRow>('recalls').toArray()) {
    const id = `${recall.lang}:${recall.ref}`;
    days.set(id, (days.get(id) ?? new Set<number>()).add(startOfDay(recall.when)));
  }
  const held = rows.filter((row) => priceOfOldClimb(row, days.get(row.id) ?? new Set<number>())).map((row): Review => ({ ...row, due: row.lastWhen + DAY }));
  await reviews.bulkPut(held);
  return held.length;
}
