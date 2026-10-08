// src/data/schedule.ts — the back-off schedule, pure: when an item (a word today; a grammar term later) next comes
// up for review, from how he has answered it. The Quick test feeds it through data/repositories/reviews.ts.
import type { Review } from './db';

export type { Review };

export const DAY = 24 * 60 * 60 * 1000;

/**
 * The gap before the next review at each step, in days. PROVISIONAL: the Mayor's steps, the Governor to confirm.
 *
 * The rule (his turn 14: an item he gets right should be seen less and less, one he gets wrong more often):
 * - An item starts at step 0 (1 day).
 * - Right twice in a row (`rights` counts the rights since the last advance or wrong) moves it up one step;
 *   a single right keeps its step and it comes back after that step's gap.
 * - One wrong drops it two steps (never below step 0), counts a lapse, and it is due tomorrow.
 * - Past the last step (step === STEP_DAYS.length) it is a rare check, due again every RARE_CHECK_DAYS days.
 */
export const STEP_DAYS = [1, 3, 7, 14, 30, 60] as const;

/** The gap, in days, once an item is past the last step. */
export const RARE_CHECK_DAYS = 90;

/** The step of the rare check: one past the last of STEP_DAYS. */
export const RARE_STEP = STEP_DAYS.length;

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

/** A wrong answer drops an item this many steps. */
const DROP_STEPS = 2;

/** The part of a Review the rule changes: everything but which item it is. */
export type Schedule = Omit<Review, 'kind' | 'id'>;

/** The gap, in ms, a step waits before the item is due again. */
export function gapOf(step: number): number {
  return (step >= RARE_STEP ? RARE_CHECK_DAYS : STEP_DAYS[step]) * DAY;
}

/** The schedule of an item after one answer at `now`; `review` is undefined for an item not scheduled yet. */
export function nextReview(review: Schedule | undefined, right: boolean, now: number): Schedule {
  const step = review?.step ?? 0;
  const lapses = review?.lapses ?? 0;
  if (!right) {
    return { step: Math.max(0, step - DROP_STEPS), due: now + DAY, lastWhen: now, lapses: lapses + 1, rights: 0 };
  }
  const rights = (review?.rights ?? 0) + 1;
  const advance = rights >= 2;
  const to = advance ? Math.min(step + 1, RARE_STEP) : step;
  return { step: to, due: now + gapOf(to), lastWhen: now, lapses, rights: advance ? 0 : rights };
}

/** Whether the item is due at `now`. */
export function isDue(review: Pick<Review, 'due'>, now: number): boolean {
  return review.due <= now;
}
