// src/memorize/progress.ts — where a memorized verse is, in the words its mark shows (mw-fu7dqf.11, docs/layout/memorize.md): the step of 7, the last recall's score and the day it is next due.
// Pure: the Memorize screen, a verse list's rows and the Verse view all draw it through ProgressMark.
import type { RecallRow } from '../data/db';

/** The steps of the ladder (steps 0..RARE_STEP of the schedule, as the session counts them). */
export const STEPS = 7;

/** The last recall of a verse in one language, as the mark reads it: `right` of `of` words (of is 0 when the recall counted none, as a self-graded one may). */
export interface LastRecall {
  score: number;
  when: number;
  right: number;
  of: number;
}

export interface Progress {
  /** The step as the session says it, 1..STEPS (the schedule's step counted from 0, plus one). */
  step: number;
  of: number;
  /** 'today' (now or already), 'tomorrow', a short weekday within six days ('Tue'), else a date ('Nov 12', with the year when it is not this one). */
  due: string;
  last: LastRecall | null;
}

const startOfDay = (when: number): number => {
  const d = new Date(when);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** When a verse is next due, in one or two words. */
export function dueDay(due: number, now: number): string {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  const when = new Date(due);
  if (days < 7) return when.toLocaleDateString('en-US', { weekday: 'short' });
  const sameYear = when.getFullYear() === new Date(now).getFullYear();
  return when.toLocaleDateString('en-US', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** The last recall's mark: the words he had of those asked. A recall that asked for no words (graded by himself) keeps its score and no count. */
export function lastOf(recall: Pick<RecallRow, 'score' | 'when' | 'missed' | 'asked'> | null | undefined): LastRecall | null {
  if (!recall) return null;
  const of = recall.asked.length;
  return { score: recall.score, when: recall.when, of, right: Math.max(0, of - recall.missed.length) };
}

/** Where a verse is on the schedule: `row` is its schedule row (step, due), `last` its newest recall in the same language. */
export function progressOf(row: { step: number; due: number }, last: LastRecall | null, now: number): Progress {
  return { step: Math.min(STEPS, Math.max(0, Math.trunc(row.step)) + 1), of: STEPS, due: dueDay(row.due, now), last };
}

/** 'Step 3 of 7 · last 9 of 10 · due Tue'; a verse not yet recalled has no 'last' part. */
export function progressLine(progress: Progress): string {
  const { step, of, last, due } = progress;
  const lastPart = last === null ? [] : [last.of > 0 ? `last ${last.right} of ${last.of}` : `last ${Math.round(last.score * 100)}%`];
  return [`Step ${step} of ${of}`, ...lastPart, `due ${due}`].join(' · ');
}

/** The verses by the verse lists that hold them, in the lists' order, then those no list holds. A verse in two lists is under both. */
export function groupVerses(refs: readonly string[], lists: ReadonlyArray<{ id: number; name: string; refs: readonly string[] }>): Array<{ key: string; name: string; refs: string[] }> {
  const groups = lists.map((l) => ({ key: `list-${l.id}`, name: l.name, refs: refs.filter((ref) => l.refs.includes(ref)) })).filter((g) => g.refs.length > 0);
  const held = new Set(lists.flatMap((l) => l.refs));
  const alone = refs.filter((ref) => !held.has(ref));
  return alone.length > 0 ? [...groups, { key: 'alone', name: 'Picked alone', refs: alone }] : groups;
}
