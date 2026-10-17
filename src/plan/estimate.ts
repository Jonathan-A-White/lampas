// src/plan/estimate.ts — where the time away most likely got her (mw-umv8sp.3): from the chapter a listening session began at and how long she was gone, walk forward
// through the plan chapter by chapter, each taking as long as it plays in the audio Bible (src/resources/audibleStarts.json). The return sheet proposes the chapter reached
// and offers the ones around it (src/plan/WhereDidYouGetTo.tsx).
import { planOf, type PlanChapter } from '../data/plans';
import audibleStarts from '../resources/audibleStarts.json' with { type: 'json' };

/** The start of each chapter in the audio, in ms, keyed 'gen.1' (audibleStarts.json's `chapters`). */
export type Starts = Readonly<Record<string, number>>;

/** How many chapters either side of the estimate are offered. */
export const AROUND = 2;

const key = (c: PlanChapter): string => `${c.code}.${c.chapter}`;

/** The chapters of each book that have a next chapter in the same book: their length is the next start minus their own. */
function knownLengths(code: string, starts: Starts): number[] {
  const lengths: number[] = [];
  for (let n = 1; `${code}.${n + 1}` in starts; n += 1) {
    const here = starts[`${code}.${n}`];
    if (here !== undefined) lengths.push(starts[`${code}.${n + 1}`] - here);
  }
  return lengths;
}

const mean = (list: number[]): number => Math.round(list.reduce((sum, ms) => sum + ms, 0) / list.length);

/**
 * How long a chapter plays, in ms: the next chapter's start minus its own within one book. A book's last chapter has no next start to subtract from (the next key is
 * another book, and the audio's end is not in the file), so it takes the mean length of the rest of its book; a book of one chapter, or a chapter with no start
 * known, takes the mean of every book's chapters.
 */
export function chapterLength(chapter: PlanChapter, starts: Starts = audibleStarts.chapters): number {
  const here = starts[key(chapter)];
  const next = starts[`${chapter.code}.${chapter.chapter + 1}`];
  if (here !== undefined && next !== undefined) return next - here;
  const rest = knownLengths(chapter.code, starts);
  if (here !== undefined && rest.length > 0) return mean(rest);
  const every = [...new Set(Object.keys(starts).map((k) => k.split('.')[0]))].flatMap((code) => knownLengths(code, starts));
  return every.length > 0 ? mean(every) : 0;
}

export interface Estimate {
  /** the chapter the time away most likely reached */
  reached: PlanChapter;
  /** the estimate and up to two chapters before and two after it, in plan order, inside the plan */
  around: PlanChapter[];
}

/**
 * The chapter she most likely got to after `elapsedMs` away from a session that began at `session`, and the chapters around it. No time away (or a clock set back) is the
 * session's own chapter; each whole chapter's length is one chapter on; the last chapter of the plan is the furthest. Undefined for a session chapter the plan does not hold.
 * Without `env` the plan is the whole Bible and the lengths are the audio Bible's.
 */
export function estimateReached(
  session: PlanChapter,
  elapsedMs: number,
  env: { chapters?: readonly PlanChapter[]; starts?: Starts } = {},
): Estimate | undefined {
  const chapters = env.chapters ?? planOf('whole-bible')?.chapters() ?? [];
  const starts = env.starts ?? audibleStarts.chapters;
  let at = chapters.findIndex((c) => c.code === session.code && c.chapter === session.chapter);
  if (at < 0) return undefined;
  let left = Math.max(0, elapsedMs);
  while (at < chapters.length - 1) {
    const length = chapterLength(chapters[at], starts);
    if (length <= 0 || left < length) break;
    left -= length;
    at += 1;
  }
  return { reached: chapters[at], around: chapters.slice(Math.max(0, at - AROUND), at + AROUND + 1) };
}
