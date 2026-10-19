// src/today/readToday.ts — the chapters he read today, as Today's Reading plan and the tutor name them (mw-5r3p30.630): consecutive chapters of a book are one range.
import type { PlanChapter } from '../data/plans';
import { chapterName } from '../plan/chapterName';

/** A run of chapters of one book with consecutive numbers, as the plan holds them in order. */
export interface ReadRun {
  code: string;
  /** the book's name: '1 Peter' */
  book: string;
  /** its chapters: '1-5', '1' */
  span: string;
  /** '1 Peter 1-5', '1 John 1' */
  name: string;
  chapters: PlanChapter[];
}

/** The chapters (in plan order) as runs: [1 Peter 1..5, 2 Peter 1..3, 1 John 1] is three runs; a book with a gap in its chapters has a run per stretch. */
export function readRuns(chapters: readonly PlanChapter[]): ReadRun[] {
  const runs: PlanChapter[][] = [];
  for (const c of chapters) {
    const run = runs[runs.length - 1];
    const last = run?.[run.length - 1];
    if (run && last && last.code === c.code && last.chapter + 1 === c.chapter) run.push(c);
    else runs.push([c]);
  }
  return runs.map((run) => {
    const first = run[0]!;
    const last = run[run.length - 1]!;
    const book = chapterName(first).replace(/ \d+$/, '');
    const span = run.length > 1 ? `${first.chapter}-${last.chapter}` : String(first.chapter);
    return { code: first.code, book, span, name: `${book} ${span}`, chapters: run };
  });
}

/** The chapters by book, the stretches of one book joined: ['1 Peter 1-5', '2 Peter 1-3'], ['Exodus 1-3, 5']. For the tutor. */
export function readRanges(chapters: readonly PlanChapter[]): string[] {
  const books: { code: string; book: string; spans: string[] }[] = [];
  for (const run of readRuns(chapters)) {
    const last = books[books.length - 1];
    if (last && last.code === run.code) last.spans.push(run.span);
    else books.push({ code: run.code, book: run.book, spans: [run.span] });
  }
  return books.map(({ book, spans }) => `${book} ${spans.join(', ')}`);
}
