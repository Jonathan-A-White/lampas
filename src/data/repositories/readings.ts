// src/data/repositories/readings.ts — what the mill made of his readings of a verse, kept on the phone. `readings` keeps the last
// result of each verse and language, the newest replacing the one before. The English row's key is the verse ('rom.8.28');
// another language's is the verse and the language ('rom.8.28:el'), so no table changes for a new language. `readingHistory`
// keeps every reading, and `missTally` counts the sounds (Greek) or words (English) among the words he misread in his last
// TALLY_READINGS readings in that language, so the ladder can see where he struggles. A repository owns its transactions.
import type { Clip } from '../../audio/clip';
import { db, type FixWord, type MissCount, type ReadingRecord, type VerseReading } from '../db';
import { missUnits } from '../grammar/readingMisses';

export type { FixWord, MissCount, ReadingRecord, VerseReading };

/** How many of his latest readings in a language the miss tally counts: a sound he has stopped missing fades out of it. */
export const TALLY_READINGS = 5;

/** The row a reading is kept in: the verse's own key for English, the verse and the language for any other. */
export const readingKey = (ref: string, lang: string): string => (lang === 'en' ? ref : `${ref}:${lang}`);

/** How far a reading reached: the index of the last word he read, the verse's word count and, for a partial reading, the word he stopped at. */
export interface Reach {
  reached: number;
  total: number;
  next?: FixWord;
}

/** The reach a reading of `total` words has: a partial one as the mill said, a whole one the last word, one that heard nothing -1. */
export const reachOf = (verdict: VerseReading['verdict'], total: number, partial?: { reached: number; next?: FixWord }): Reach =>
  verdict === 'partial' && partial
    ? { reached: Math.min(partial.reached, total - 1), total, ...(partial.next ? { next: partial.next } : {}) }
    : { reached: verdict === 'incomplete' ? -1 : total - 1, total };

/** Where an earlier reading got to; one kept before the reach existed counts as whole unless it heard nothing. */
const reachedBefore = (before: ReadingRecord): number => before.reached ?? (before.verdict === 'incomplete' ? -1 : Infinity);

export async function keepVerseReading(
  ref: string,
  verdict: VerseReading['verdict'],
  words: FixWord[],
  note: string,
  lang = 'en',
  now = Date.now(),
  clip?: Clip,
  reach?: Reach,
  text?: string,
): Promise<void> {
  await db.transaction('rw', db.readings, db.readingHistory, db.missTally, async () => {
    // a partial reading that went past the reading of this verse in this language before it says so
    const before = reach && verdict === 'partial' ? await lastRecord(ref, lang) : undefined;
    const further = before !== undefined && reach !== undefined && reach.reached > reachedBefore(before);
    await db.readings.put({
      ref: readingKey(ref, lang),
      verdict,
      words,
      note,
      when: now,
      ...(reach ? { reached: reach.reached, total: reach.total, ...(reach.next ? { next: reach.next } : {}) } : {}),
      ...(further ? { further: true as const } : {}),
      ...(text ? { text } : {}),
      ...(clip ? { clip } : {}),
    });
    await db.readingHistory.add({ ref, lang, verdict, words, at: now, ...(reach ? { reached: reach.reached, total: reach.total } : {}) });
    await retally(lang);
  });
}

/** The latest reading of a verse in `lang` in the history, if any. */
async function lastRecord(ref: string, lang: string): Promise<ReadingRecord | undefined> {
  const all = await db.readingHistory.where('ref').equals(ref).filter((r) => r.lang === lang).toArray();
  return all.sort((a, b) => b.at - a.at || (b.id ?? 0) - (a.id ?? 0))[0];
}

/** Counts the readings among the last TALLY_READINGS in `lang` that missed each unit, and replaces that language's rows. */
async function retally(lang: string): Promise<void> {
  const latest = await db.readingHistory
    .where('[lang+at]')
    .between([lang, -Infinity], [lang, Infinity])
    .reverse()
    .limit(TALLY_READINGS)
    .toArray();
  const counts = new Map<string, number>();
  // a unit counts once for each reading it was missed in, however many of that reading's words hold it (the drill offers one missed in two readings)
  for (const reading of latest) for (const unit of new Set(missUnits(lang, reading.words))) counts.set(unit, (counts.get(unit) ?? 0) + 1);
  await db.missTally.where('lang').equals(lang).delete();
  await db.missTally.bulkPut([...counts].map(([unit, count]) => ({ lang, unit, count })));
}

/** The last reading of a verse in `lang`, or undefined when it has not been read yet in that language. */
export function getVerseReading(ref: string, lang = 'en'): Promise<VerseReading | undefined> {
  return db.readings.get(readingKey(ref, lang));
}

/** Every reading kept, oldest first; `ref` ('rom.8.28') keeps only that verse's. */
export async function listReadingHistory(ref?: string): Promise<ReadingRecord[]> {
  const all = ref === undefined ? await db.readingHistory.toArray() : await db.readingHistory.where('ref').equals(ref).toArray();
  return all.sort((a, b) => a.at - b.at || (a.id ?? 0) - (b.id ?? 0));
}

/** What he misreads most in `lang` over his last readings: the units with their counts, the most missed first. */
export async function getMissTally(lang: string): Promise<MissCount[]> {
  const rows = await db.missTally.where('lang').equals(lang).toArray();
  return rows.sort((a, b) => b.count - a.count || a.unit.localeCompare(b.unit));
}
