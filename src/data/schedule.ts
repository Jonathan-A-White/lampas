// src/data/schedule.ts — the back-off schedule, pure: when an item (a word today; a grammar term later) next comes
// up for review, from how he has answered it. The Quick test feeds it through data/repositories/reviews.ts.
// The rule itself is learn-kit's (mw-79en7t.5, `learn-kit/graph`): the steps, the gaps, what one answer does and when an item is due. What stays here is
// Lampas's: how a screen asks a word at a step (modeFor) and the stored Review row.
import type { Review } from './db';

export type { Review };

/**
 * The gap before the next review at each step, in days: STEP_DAYS, then a rare check every RARE_CHECK_DAYS days past the last step (RARE_STEP). PROVISIONAL: the Mayor's
 * steps, the Governor to confirm.
 *
 * The rule (his turn 14: an item he gets right should be seen less and less, one he gets wrong more often):
 * - An item starts at step 0 (1 day).
 * - Right twice in a row (`rights` counts the rights since the last advance or wrong) moves it up one step;
 *   a single right keeps its step and it comes back after that step's gap.
 * - One wrong drops it two steps (never below step 0), counts a lapse, and it is due tomorrow.
 * - Past the last step (step === STEP_DAYS.length) it is a rare check, due again every RARE_CHECK_DAYS days.
 * - startSchedule(now) puts an item at step 0, due after the first gap; knownSchedule(now) one he knows already at KNOWN_STEP (the 30-day step), due in 30 days.
 */
export { DAY, KNOWN_STEP, RARE_CHECK_DAYS, RARE_STEP, STEP_DAYS, gapOf, isDue, knownSchedule, nextReview, startSchedule } from 'learn-kit/graph';

/**
 * How a word is asked, from its step. PROVISIONAL: the Mayor's pick, the Governor to confirm. Multiple choice while a word
 * is weak (below FLASHCARD_STEP), a flashcard (see the lemma, recall, grade yourself) once it is stronger; a lapse that drops
 * the step below the threshold makes it multiple choice again.
 */
export type QuestionMode = 'choice' | 'flashcard';

/** The first step asked as a flashcard (step 3: the 14-day gap): the one place the threshold lives. */
export const FLASHCARD_STEP = 3;

/** The mode a word at `step` is asked in; a word not scheduled yet is at step 0. */
export function modeFor(step: number): QuestionMode {
  return step >= FLASHCARD_STEP ? 'flashcard' : 'choice';
}

/** The part of a Review the rule changes: everything but which item it is. */
export type Schedule = Omit<Review, 'kind' | 'id'>;
