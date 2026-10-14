// src/data/grammar/drillPlan.ts — Your drill plan (mw-i7xe0n.4, docs/grammar.md 'Your drill plan', PROVISIONAL, pure: no store, no screen). The Governor's want: 'come back with a plan
// for drilling tailored to that person so that they can get to yes I really know this and can move on knowing that they really know it'.
//   planFrom(result): a Drill it run that did not prove its idea and left weak facets gives a plan: one short drill for each weak facet, the easiest facet first (the lowest step
//     the run asked it at), then 'Prove it', a full Drill it that closes the plan when it passes. A run with no weak facet makes no plan.
//   facetQuestions(steps, item): the 4 to 6 questions of a facet's short drill, at and just below the step the run's edge stood at.
//   A plan is kept and scheduled by data/repositories/drillPlans.ts (review kind 'drill-plan'); no tutor is asked anything.
import { drillSteps, type DrillOptions, type DrillQuestion, type DrillResult, type DrillStep } from './drillIt';
import type { Facet } from './ladder';

/** The review kind of a plan's items: src/review/kinds.ts DRILL_PLAN. */
export const PLAN_KIND = 'drill-plan';
/** The id of the last item of every plan, the full Drill it. */
export const PROVE_ID = 'prove';
/** The fewest and the most questions in a facet's short drill. PROVISIONAL. */
export const FACET_QUESTIONS_MIN = 4;
export const FACET_QUESTIONS_MAX = 6;
/** The share of a short drill's questions he must get right for the item to be done (4 of 4 or 3 of 4, 5 of 6 ...: one miss is allowed). PROVISIONAL. */
export const FACET_PASS = 0.75;

export interface PlanItem {
  /** 'facet:<facet id>' or PROVE_ID: unique in its plan */
  id: string;
  kind: 'facet' | 'prove';
  /** the facet a short drill is about; none for Prove it */
  facet?: Facet;
  /** the step the short drill is centred on: the run's edge step (at least 1) */
  step: number;
  /** answered right on its schedule */
  done: boolean;
}

export interface DrillPlan {
  ideaId: string;
  /** when the run that made it was kept; it names the plan, so an answer to an item of an older plan is ignored */
  at: number;
  items: PlanItem[];
}

const facetItemId = (facet: Facet): string => `facet:${facet.id}`;

/** The plan a run calls for, or null when it proved the idea or left no weak facet to drill. */
export function planFrom(result: DrillResult, at: number): DrillPlan | null {
  if (result.proved || result.weak.length === 0) return null;
  const lowest = (facet: Facet): number => Math.min(Infinity, ...result.answers.filter((a) => a.facet.id === facet.id).map((a) => a.step));
  // the easiest facet first; the run's own order (the order it was missed in) breaks a tie
  const weak = result.weak
    .map((facet, i) => ({ facet, i, step: lowest(facet) }))
    .sort((a, b) => a.step - b.step || a.i - b.i);
  const edge = Math.max(1, result.edgeStep);
  const items: PlanItem[] = [
    ...weak.map(({ facet }): PlanItem => ({ id: facetItemId(facet), kind: 'facet', facet: { id: facet.id, label: facet.label }, step: edge, done: false })),
    { id: PROVE_ID, kind: 'prove', step: result.topStep, done: false },
  ];
  return { ideaId: result.ideaId, at, items };
}

/** How many items of the plan are still to do: the number the Goal screen writes ('Drill plan: 3 to go'). */
export const toGo = (plan: DrillPlan): number => plan.items.filter((i) => !i.done).length;

/** The first item not done, or undefined for a plan that is finished. */
export const nextItem = (plan: DrillPlan): PlanItem | undefined => plan.items.find((i) => !i.done);

/** The schedule row id of an item: '<idea id>|<item id>'. */
export const rowId = (ideaId: string, itemId: string): string => `${ideaId}|${itemId}`;

/** The idea and item a schedule row id names, or null for one that is not of a plan. */
export function parseRowId(id: string): { ideaId: string; itemId: string } | null {
  const at = id.indexOf('|');
  return at <= 0 || at === id.length - 1 ? null : { ideaId: id.slice(0, at), itemId: id.slice(at + 1) };
}

/**
 * The questions of a facet's short drill: those of the facet at the item's step and the one just below it, FACET_QUESTIONS_MAX at most; when the facet has fewer than
 * FACET_QUESTIONS_MIN there, the nearest steps' fill the drill (an easier step first on a tie). The steps are drillSteps' (the same seed gives the same questions).
 */
export function facetQuestions(steps: readonly DrillStep[], item: PlanItem): DrillQuestion[] {
  if (!item.facet) return [];
  const own = steps.flatMap((s) => s.questions).filter((q) => q.facet.id === item.facet?.id);
  const near = own.filter((q) => q.step === item.step || q.step === item.step - 1);
  if (near.length >= FACET_QUESTIONS_MIN) return near.slice(0, FACET_QUESTIONS_MAX);
  const distance = (q: DrillQuestion): number => Math.abs(q.step - item.step) + (q.step > item.step ? 0.5 : 0);
  const rest = own.filter((q) => !near.includes(q)).sort((a, b) => distance(a) - distance(b));
  return [...near, ...rest.slice(0, FACET_QUESTIONS_MIN - near.length)].slice(0, FACET_QUESTIONS_MAX);
}

/** Whether a short drill with `right` of `asked` questions right is done. */
export const facetPassed = (right: number, asked: number): boolean => asked > 0 && right >= Math.ceil(asked * FACET_PASS);

/** The short drill of a facet item of an idea's plan, drawn from the idea's steps for `options` (the passage and seed). */
export const shortDrill = (ideaId: string, item: PlanItem, options: DrillOptions = {}): DrillQuestion[] => facetQuestions(drillSteps(ideaId, options), item);
