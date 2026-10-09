// src/data/repositories/readings.ts — what the mill made of his last reading of a verse, kept on the phone: one result per
// verse and per language read, the newest replacing the one before. The English row's key is the verse ('rom.8.28'); another
// language's is the verse and the language ('rom.8.28:el'), so no table changes for a new language. A repository owns its
// transactions.
import type { Clip } from '../../audio/clip';
import { db, type FixWord, type VerseReading } from '../db';

export type { FixWord, VerseReading };

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
  await db.readings.put({ ref: readingKey(ref, lang), verdict, words, note, when: now, ...(clip ? { clip } : {}) });
}

/** The last reading of a verse in `lang`, or undefined when it has not been read yet in that language. */
export function getVerseReading(ref: string, lang = 'en'): Promise<VerseReading | undefined> {
  return db.readings.get(readingKey(ref, lang));
}
