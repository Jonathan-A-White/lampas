// src/talk/quizGoalOffer.ts — the quiz goal the tutor offers for his tap (mw-5r3p30.185). The offer is only for a goal not yet kept: when the answer's offer is the goal he has kept,
// or the one he chose Just this time for, it is a slip of the tutor's (mw-5r3p30.681) and is dropped, so he is never asked to set the goal he already has.

const same = (a: string, b: string): boolean => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

/** The goal's state the answer wrote beside its offer (mw-gdcyf98.32): the schema allows an offer only with 'none'; a model that wrote 'kept' or 'once' and offered anyway slipped. */
export type QuizGoalState = 'kept' | 'once' | 'none';

/** The offer the app keeps, or undefined: none when the answer made none, when it wrote a `state` of kept or once beside it, or when it names the goal already kept (`kept`, '' when none) or chosen for this quiz alone (`once`). */
export function quizGoalOfferOf(offer: string | undefined, goal: { kept: string; once?: string }, state?: QuizGoalState): string | undefined {
  if (!offer) return undefined;
  if (state === 'kept' || state === 'once') return undefined;
  if (goal.kept !== '' && same(offer, goal.kept)) return undefined;
  if (goal.once && same(offer, goal.once)) return undefined;
  return offer;
}
