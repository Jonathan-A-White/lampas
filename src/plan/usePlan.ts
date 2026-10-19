// src/plan/usePlan.ts — the reading plan as the Reader draws it (mw-umv8sp.5): whether the Reading plan setting is On and, when a plan is started, the next chapter, how many
// chapters are done and the keys of those done. undefined until both have been read, so a chip is not drawn as 'not started' for a frame. With the setting Off the plan is
// not shown at all (`started` is undefined), whatever is kept: the chip invites her to start one and the picker marks nothing.
import { planOf, type PlanChapter } from '../data/plans';
import { getReadingPlan, keyOf, readOn } from '../data/repositories/readingPlan';
import { useLatestLiveQuery } from '../data/useLatestLiveQuery';
import { readingPlanSetting } from '../settings/definitions/readingPlan';
import { getSetting } from '../settings/store';

export interface PlanView {
  /** the first chapter of the plan not done, or undefined when every chapter is done */
  next: PlanChapter | undefined;
  /** the keys ('gen.1') of the chapters done */
  done: ReadonlySet<string>;
  /** the number of chapters done and the plan's length */
  count: number;
  total: number;
  /** the chapters marked done on this local date ('2026-10-19'), in plan order (mw-5r3p30.630) */
  readOn: (date: string) => PlanChapter[];
}

/** The plan as it stands now, read once (usePlan keeps it live). */
export async function readPlan(): Promise<{ started: PlanView | undefined }> {
  const [on, state] = await Promise.all([getSetting(readingPlanSetting), getReadingPlan()]);
  const chapters = on === 'on' && state ? planOf(state.planId)?.chapters() : undefined;
  if (!state || !chapters) return { started: undefined };
  const done = new Set(state.done);
  return { started: { next: chapters.find((c) => !done.has(keyOf(c))), done, count: chapters.filter((c) => done.has(keyOf(c))).length, total: chapters.length, readOn: (date) => readOn(state, date) } };
}

/** The plan to draw: `{ started }` once read (started undefined when the setting is Off or none is started), or undefined while reading. */
export function usePlan(): { started: PlanView | undefined } | undefined {
  return useLatestLiveQuery(readPlan);
}
