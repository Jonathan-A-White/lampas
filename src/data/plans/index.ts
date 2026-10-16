// src/data/plans/index.ts — the reading plans Lampas offers (mw-umv8sp.1). One today: the whole Bible. A second plan is one new file here and one line in PLANS.
import { wholeBible } from './wholeBible';
import type { Plan } from './plan';

export type { Plan, PlanChapter } from './plan';

const PLANS: readonly Plan[] = [wholeBible];

/** The plans to choose from: their ids and names. */
export const listPlans = (): { id: string; name: string }[] => PLANS.map(({ id, name }) => ({ id, name }));

/** The plan with this id, or undefined. */
export const planOf = (id: string): Plan | undefined => PLANS.find((plan) => plan.id === id);
