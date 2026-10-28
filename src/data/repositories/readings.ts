// src/data/repositories/readings.ts — what the mill made of his readings of a verse, kept on the phone. `readings` keeps the last
// result of each verse and language, the newest replacing the one before. The English row's key is the verse ('rom.8.28');
// another language's is the verse and the language ('rom.8.28:el'), so no table changes for a new language. `readingHistory`
// keeps every reading, and `missTally` counts the sounds (Greek) or words (English) among the words he misread in his last
// TALLY_READINGS readings in that language, so the ladder can see where he struggles. A repository owns its transactions.
import type { Clip } from '../../audio/clip';
import { db, type FixWord, type MissCount, type ReadingRecord, type VerseReading } from '../db';
import { bookOf } from '../books';
import { missUnits } from '../grammar/readingMisses';
import { WOVEN_LANG } from '../wovenLang';
import { REDRAWN } from './diagrams';

export type { FixWord, MissCount, ReadingRecord, VerseReading };

/** How many of his latest readings in a language the miss tally counts: a sound he has stopped missing fades out of it. */
export const TALLY_READINGS = 5;

/**
 * The mark of the Greek words a reading of `ref` ('phm.1.1', a passage 'phm.1.1-2') in `lang` was scored against, when the RP 2026 overlay moved a word of the unit (REDRAWN `moved`):
 * a reading holds the verse's word indexes (FixWord.index, reached, next, total), and one kept before the overlay holds the old words' (mw-9ji6ek0.11). '' for English, a woven reading
 * (it keeps its own text) and every unit the overlay did not move.
 */
export function indexMarkOf(ref: string, lang: string): string {
  const unit = lang === 'en' || lang === WOVEN_LANG ? null : /^([^.]+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
  if (!unit) return '';
  const [, code, chapter, first, last = first] = unit;
  const name = bookOf(code)?.name;
  return REDRAWN.filter((r) => r.moved && r.book === name && r.chapter === Number(chapter) && r.verse >= Number(first) && r.verse <= Number(last))
    .map((r) => r.mark)
    .join('+');
}

/** The row a reading is kept in: the verse's own key for English, the verse and the language for any other, and the mark (indexMarkOf) after it where the overlay moved the verse's words, so a row kept before is never read again. */
export const readingKey = (ref: string, lang: string): string => {
  if (lang === 'en') return ref;
  const mark = indexMarkOf(ref, lang);
  return `${ref}:${lang}${mark ? `+${mark}` : ''}`;
};

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

/** Whether a history row holds indexes of words the overlay has since moved: its verse is marked and the row was not kept under the mark. */
const isStale = (r: ReadingRecord): boolean => indexMarkOf(r.ref, r.lang) !== (r.marks ?? '');

/** The row as a screen may see it: a stale one without the indexes it holds (its words are still the words he misread, which the tallies go by). */
const withoutIndexes = (r: ReadingRecord): ReadingRecord => {
  const kept: ReadingRecord = { ...r, words: r.words.map((w) => ({ ...w })) };
  delete kept.reached;
  delete kept.total;
  for (const w of kept.words) delete w.index;
  return kept;
};

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
    const marks = indexMarkOf(ref, lang);
    await db.readingHistory.add({ ref, lang, verdict, words, at: now, ...(reach ? { reached: reach.reached, total: reach.total } : {}), ...(marks ? { marks } : {}) });
    await retally(lang);
  });
}

/** The latest reading of a verse in `lang` in the history, if any. */
async function lastRecord(ref: string, lang: string): Promise<ReadingRecord | undefined> {
  const all = await db.readingHistory.where('ref').equals(ref).filter((r) => r.lang === lang && !isStale(r)).toArray();
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
  return all.sort((a, b) => a.at - b.at || (a.id ?? 0) - (b.id ?? 0)).map((r) => (isStale(r) ? withoutIndexes(r) : r));
}

/** What he misreads most in `lang` over his last readings: the units with their counts, the most missed first. */
export async function getMissTally(lang: string): Promise<MissCount[]> {
  const rows = await db.missTally.where('lang').equals(lang).toArray();
  return rows.sort((a, b) => b.count - a.count || a.unit.localeCompare(b.unit));
}
