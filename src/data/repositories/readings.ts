// src/data/repositories/readings.ts — what the mill made of his last reading of a verse, kept on the phone: one result per
// verse, the newest replacing the one before. A repository owns its transactions.
import { db, type FixWord, type VerseReading } from '../db';

export type { FixWord, VerseReading };

export async function keepVerseReading(ref: string, verdict: VerseReading['verdict'], words: FixWord[], note: string, now = Date.now()): Promise<void> {
  await db.readings.put({ ref, verdict, words, note, when: now });
}

/** The last reading of a verse, or undefined when it has not been read yet. */
export function getVerseReading(ref: string): Promise<VerseReading | undefined> {
  return db.readings.get(ref);
}
