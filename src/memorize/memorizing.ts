// src/memorize/memorizing.ts — what the tutor reads of his memorizing (mw-fu7dqf.12, the fact `memorizing`): a summary line first, then each verse he memorizes with the lists that hold it and,
// for each language, where it is on the schedule (the step as a session says it, when it is due) and its last recall's score and missed words. Read from the same rows the Memorize screen draws.
import { listVerseLists } from '../data/repositories/verseLists';
import { listProgress } from '../data/repositories/memorize';
import { EVIDENCE_MISSED } from './evidence';
import { localDate } from '../data/daily/dailyStore';
import { dueDay, lastOf, progressOf } from './progress';
import { nameOf } from './commands';
import type { MemorizeLang } from './languages';

/** The most bytes the fact weighs as JSON in UTF-8: the verses beyond it are left out and the summary still counts them. */
export const MEMORIZING_BYTES = 5000;

export interface MemorizingLang {
  lang: MemorizeLang;
  /** the step as a session says it: 1 to `of` */
  step: number;
  of: number;
  /** 'today', 'tomorrow', a weekday or a date */
  due: string;
  dueNow: boolean;
  last: { score: number; on: string; missed: string[] } | null;
}

export interface MemorizingVerse {
  ref: string;
  heading: string;
  lists: Array<{ id: number; name: string }>;
  langs: MemorizingLang[];
}

export interface Memorizing {
  summary: string;
  verses: MemorizingVerse[];
}

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** His verses as the tutor reads them: the longest overdue first. */
export async function memorizingNow(now = Date.now()): Promise<Memorizing> {
  const [progress, lists] = await Promise.all([listProgress(), listVerseLists()]);
  if (progress.length === 0) return { summary: 'Nothing memorized yet', verses: [] };
  const byRef = new Map<string, typeof progress>();
  for (const p of progress) byRef.set(p.row.ref, [...(byRef.get(p.row.ref) ?? []), p]);
  const due = progress.filter((p) => p.row.due <= now).length;
  const verses: MemorizingVerse[] = [...byRef.entries()]
    .sort((a, b) => Math.min(...a[1].map((p) => p.row.due)) - Math.min(...b[1].map((p) => p.row.due)))
    .map(([ref, rows]) => ({
      ref,
      heading: nameOf(ref),
      lists: lists.filter((l) => l.refs.includes(ref)).map((l) => ({ id: l.id, name: l.name })),
      langs: rows.map(({ row, last }): MemorizingLang => {
        const mark = progressOf(row, lastOf(last), now);
        return {
          lang: row.lang,
          step: mark.step,
          of: mark.of,
          due: dueDay(row.due, now),
          dueNow: row.due <= now,
          last: last ? { score: Math.round(last.score * 100) / 100, on: localDate(new Date(last.when)), missed: last.missed.slice(0, EVIDENCE_MISSED) } : null,
        };
      }),
    }));
  const summary = `${plural(byRef.size, 'verse')} memorized, ${progress.length} in all by language, ${due} due now`;
  const kept = [...verses];
  while (kept.length > 1 && new TextEncoder().encode(JSON.stringify({ summary, verses: kept })).length > MEMORIZING_BYTES) kept.pop();
  return { summary, verses: kept };
}
