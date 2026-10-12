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

export async function keepVerseReading(
  ref: string,
  verdict: VerseReading['verdict'],
  words: FixWord[],
  note: string,
  lang = 'en',
  now = Date.now(),
  clip?: Clip,
): Promise<void> {
  await db.transaction('rw', db.readings, db.readingHistory, db.missTally, async () => {
    await db.readings.put({ ref: readingKey(ref, lang), verdict, words, note, when: now, ...(clip ? { clip } : {}) });
    await db.readingHistory.add({ ref, lang, verdict, words, at: now });
    await retally(lang);
  });
}

/** Counts the misses in the last TALLY_READINGS readings in `lang` and replaces that language's rows. */
async function retally(lang: string): Promise<void> {
  const latest = await db.readingHistory
    .where('[lang+at]')
    .between([lang, -Infinity], [lang, Infinity])
    .reverse()
    .limit(TALLY_READINGS)
    .toArray();
  const counts = new Map<string, number>();
  for (const reading of latest) for (const unit of missUnits(lang, reading.words)) counts.set(unit, (counts.get(unit) ?? 0) + 1);
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
