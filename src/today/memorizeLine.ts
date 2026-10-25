// src/today/memorizeLine.ts — what Today's Memorize piece says (mw-fu7dqf.10): the verses due, the longest overdue one a tap starts, and whether any verse is memorized at all.
// Today draws it and the tutor's day (src/data/learnerToday.ts) titles it, so both say it the same way.
import { listMemorized, listDueVerses, parseVerseId } from '../data/repositories/memorize';
import type { MemorizeLang } from '../memorize/languages';

export interface MemorizeToday {
  /** how many verses (a verse in two languages counts twice, as Memorize's home lists it) are due */
  due: number;
  /** the longest overdue verse, where a tap starts */
  first?: { ref: string; lang: MemorizeLang };
  /** whether any verse is memorized, due or not */
  any: boolean;
}

export async function memorizeToday(now = Date.now()): Promise<MemorizeToday> {
  const rows = await listDueVerses(now);
  const first = rows.flatMap((row) => parseVerseId(row.id) ?? [])[0];
  return { due: rows.length, first, any: rows.length > 0 || (await listMemorized()).length > 0 };
}

/** 'Memorize: 2 verses due', 'Memorize: 1 verse due', 'Memorize: nothing due', or 'Memorize: pick verses in a list' while no verse is memorized. */
export function memorizeLine({ due, any }: MemorizeToday): string {
  if (due > 0) return `Memorize: ${due} ${due === 1 ? 'verse' : 'verses'} due`;
  return any ? 'Memorize: nothing due' : 'Memorize: pick verses in a list';
}
