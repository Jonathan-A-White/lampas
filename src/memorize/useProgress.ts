// src/memorize/useProgress.ts — the memorized verses with where each is (mw-fu7dqf.11): live over the schedule rows and the recalls, so a mark follows a recall, a Stop memorizing and a new verse.
import { useLiveQuery } from 'dexie-react-hooks';
import { listProgress } from '../data/repositories/memorize';
import type { MemorizeLang } from './languages';
import { lastOf, progressOf, type Progress } from './progress';

/** One memorized verse in one language: where it is, and whether it is due now. */
export interface VerseProgress {
  ref: string;
  lang: MemorizeLang;
  progress: Progress;
  /** When it is next due (ms), for ordering. */
  due: number;
  dueNow: boolean;
}

/** Every memorized verse in every language, or only `refs`' (undefined until read), the longest overdue first. */
export function useProgress(refs?: readonly string[]): VerseProgress[] | undefined {
  const key = refs?.join(' ');
  return useLiveQuery(async () => {
    const now = Date.now();
    const found = await listProgress(refs);
    return found
      .map(({ row, last }): VerseProgress => ({ ref: row.ref, lang: row.lang, progress: progressOf(row, lastOf(last), now), due: row.due, dueNow: row.due <= now }))
      .sort((a, b) => a.due - b.due);
  }, [key]);
}
