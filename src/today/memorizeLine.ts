// src/today/memorizeLine.ts — what Today's Memorize piece says (mw-fu7dqf.10): the verses due, the longest overdue one a tap starts, and whether any verse is memorized at all.
// Today draws it and the tutor's day (src/data/learnerToday.ts) titles it, so both say it the same way.
import { dayProgress } from '../data/repositories/reviews';
import { listMemorized, listDueVerses, parseVerseId, VERSE_KIND } from '../data/repositories/memorize';
import type { MemorizeLang } from '../memorize/languages';

export interface MemorizeToday {
  /** how many verses (a verse in two languages counts twice, as Memorize's home lists it) are due */
  due: number;
  /** how many verse rows were answered since his local midnight and are not due again (the same day and rule as Review's, reviews.ts dayProgress) */
  done: number;
  /** the longest overdue verse, where a tap starts */
  first?: { ref: string; lang: MemorizeLang };
  /** whether any verse is memorized, due or not */
  any: boolean;
}

export async function memorizeToday(now = Date.now()): Promise<MemorizeToday> {
  const rows = await listDueVerses(now);
  const first = rows.flatMap((row) => parseVerseId(row.id) ?? [])[0];
  const { done } = await dayProgress(now, VERSE_KIND);
  return { due: rows.length, done, first, any: rows.length > 0 || (await listMemorized()).length > 0 };
}

/**
 * 'Memorize: 2 verses due', 'Memorize: 1 verse due', 'Memorize: nothing due', or 'Memorize: pick verses in a list' while no verse is memorized. Once he has answered a verse today
 * (mw-indx1x6.21): 'Memorize: 3 of 8 done today · 5 due' (M = done + due), or '... · nothing due'. With nothing answered it reads as ever: no '0 of 8', no '0 of 0'.
 */
export function memorizeLine({ due, done, any }: MemorizeToday): string {
  if (done > 0) return `Memorize: ${done} of ${done + due} done today · ${due === 0 ? 'nothing due' : `${due} due`}`;
  if (due > 0) return `Memorize: ${due} ${due === 1 ? 'verse' : 'verses'} due`;
  return any ? 'Memorize: nothing due' : 'Memorize: pick verses in a list';
}
