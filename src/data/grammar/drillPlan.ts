// src/data/grammar/drillPlan.ts — Your drill plan (mw-i7xe0n.4, docs/grammar.md 'Your drill plan', PROVISIONAL, pure: no store, no screen). The Governor's want: 'come back with a plan
// for drilling tailored to that person so that they can get to yes I really know this and can move on knowing that they really know it'.
//   planFrom(result): a Drill it run that did not prove its idea and left weak facets gives a plan: one short drill for each weak facet, the easiest facet first (the lowest step
//     the run asked it at), then 'Prove it', a full Drill it that closes the plan when it passes. A run with no weak facet makes no plan.
//   facetQuestions(steps, item): the 4 to 6 questions of a facet's short drill, at and just below the step the run's edge stood at.
//   A plan is kept and scheduled by data/repositories/drillPlans.ts (review kind 'drill-plan'); no tutor is asked anything.
// The rules of the plan are learn-kit's (mw-79en7t.5, `learn-kit/drill`): which facets, in which order, how many questions of a short drill and when one is done. This file puts
// them in Lampas's words (an idea, not a node) and keeps what is Lampas's: the review kind and the schedule row ids.
import {
  FACET_PASS,
  FACET_QUESTIONS_MAX,
  FACET_QUESTIONS_MIN,
  PROVE_ID,
  facetPassed,
  facetQuestions as kitFacetQuestions,
  nextItem as kitNextItem,
  planFrom as kitPlanFrom,
  toGo as kitToGo,
  type GapPlan,
  type PlanItem,
} from 'learn-kit/drill';
import type { GrammarQuestion } from './questions';
import { asDrillQuestion, drillSteps, type DrillOptions, type DrillQuestion, type DrillResult, type DrillStep } from './drillIt';

/** The review kind of a plan's items: src/review/kinds.ts DRILL_PLAN. */
export const PLAN_KIND = 'drill-plan';
/** The id of the last item of every plan, the full Drill it; the fewest and the most questions in a facet's short drill; the share of a short drill he must get right (one miss allowed). PROVISIONAL. */
export { FACET_PASS, FACET_QUESTIONS_MAX, FACET_QUESTIONS_MIN, PROVE_ID, facetPassed };
export type { PlanItem };

export interface DrillPlan {
  ideaId: string;
  /** when the run that made it was kept; it names the plan, so an answer to an item of an older plan is ignored */
  at: number;
  items: PlanItem[];
}

const gapOf = (plan: DrillPlan): GapPlan => ({ nodeId: plan.ideaId, at: plan.at, items: plan.items });

/** The plan a run calls for, or null when it proved the idea or left no weak facet to drill. */
export function planFrom(result: DrillResult, at: number): DrillPlan | null {
  const plan = kitPlanFrom({ ...result, nodeId: result.ideaId }, at);
  return plan && { ideaId: plan.nodeId, at: plan.at, items: plan.items };
}

/** How many items of the plan are still to do: the number the Goal screen writes ('Drill plan: 3 to go'). */
export const toGo = (plan: DrillPlan): number => kitToGo(gapOf(plan));

/** The first item not done, or undefined for a plan that is finished. */
export const nextItem = (plan: DrillPlan): PlanItem | undefined => kitNextItem(gapOf(plan));

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
  const kit = steps.map((s) => ({ step: s.step, title: s.title, questions: s.questions.map((q) => ({ key: q.key, form: 'grammar', payload: q, facet: q.facet, step: q.step })) }));
  return kitFacetQuestions(kit, item).map((q) => q.payload);
}

/** The short drill of a facet item of an idea's plan, drawn from the idea's steps for `options` (the passage and seed). */
export const shortDrill = (ideaId: string, item: PlanItem, options: DrillOptions = {}): DrillQuestion[] => facetQuestions(drillSteps(ideaId, options), item);

/**
 * The questions of a short drill with one the mill wrote (kept on the phone, docs/grammar.md 'More items from the mill') in place of the one at `at`; the questions when `at` is not one of them or the item is of
 * another idea. The drill's end is unchanged: how many are right of how many.
 */
export function withFetched(questions: readonly DrillQuestion[], kept: GrammarQuestion, at: number): DrillQuestion[] {
  const place = questions[at];
  if (!place || kept.ideaId !== place.ideaId) return [...questions];
  return questions.map((q, i) => (i === at ? asDrillQuestion(kept, place, [{ step: place.step, title: '', questions: [place] }]) : q));
}
