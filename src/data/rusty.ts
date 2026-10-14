// src/data/rusty.ts — rust (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'): a SOLID word or idea he now slips on, or has not met for a long while, is rusty. A person is not always going
// forward: he takes a break and comes back, and the tutor should say "I see you are rusty on X, it was solid before" and offer to move it back to Frontier and practise it.
// Pure: the candidates are the solid items with their schedule rows (data/learnerRusty.ts reads them); the thresholds below are the only ones.
import { DAY, type Review } from './schedule';

/** PROVISIONAL (the Mayor, the Governor to confirm): a wrong answer among an item's last RECENT_ANSWERS answers makes it rusty. */
export const RECENT_ANSWERS = 3;
/** PROVISIONAL: a slip this recent (days) is said to be 'this week'. */
export const RUSTY_SLIP_DAYS = 7;
/** PROVISIONAL: an item this many days past its due date (he has been away) is rusty. */
export const RUSTY_OVERDUE_DAYS = 7;
/** PROVISIONAL: the most rusty items one request carries. */
export const RUSTY_MAX = 8;
/** PROVISIONAL: no use of the app for this many days is a break; opening it after one offers Welcome back. */
export const BREAK_DAYS = 7;
/** PROVISIONAL: the most items the Welcome back refresher names. */
export const WELCOME_BACK_ITEMS = 5;

/** What the tutor's offer to move rusty items back is called on its button, and in the `pending_offer` a spoken yes or no is read against. */
export const RUSTY_BUTTON = 'Move back to Frontier and practise';

/** A solid item with its place on the schedule: a word (id and title the lemma) or a grammar idea (id the ladder's, title its name). */
export interface RustyCandidate {
  kind: 'word' | 'idea';
  id: string;
  title: string;
  review: Review;
}

/** One item the tutor is told is rusty: why is the plain reason ('slipped twice this week', 'not seen for 3 weeks'). */
export interface RustyItem {
  kind: 'word' | 'idea';
  id: string;
  title: string;
  why: string;
}

const days = (ms: number): number => Math.floor(ms / DAY);

/** The wrong answers among the item's last RECENT_ANSWERS, newest last. */
const slipsOf = (review: Review): number[] => (review.recent ?? []).slice(-RECENT_ANSWERS).filter((a) => !a.right).map((a) => a.when);

/** 'slipped twice this week', 'slipped 3 times this week', 'slipped this week', or 'slipped lately' for a slip older than a week. */
function slipWhy(slips: number[], now: number): string {
  const week = slips.filter((when) => now - when < RUSTY_SLIP_DAYS * DAY).length;
  if (week === 0) return 'slipped lately';
  if (week === 1) return 'slipped this week';
  return week === 2 ? 'slipped twice this week' : `slipped ${week} times this week`;
}

/** 'not seen for a week', 'not seen for 3 weeks'. */
function unseenWhy(review: Review, now: number): string {
  const weeks = Math.max(1, Math.round(days(now - review.lastWhen) / 7));
  return weeks === 1 ? 'not seen for a week' : `not seen for ${weeks} weeks`;
}

/**
 * The rusty items among the solid candidates, worst first, at most RUSTY_MAX: those with a wrong answer among their last RECENT_ANSWERS (most slips first, then the newest slip),
 * then those overdue by RUSTY_OVERDUE_DAYS or more (the longest unseen first). An item reviewed right lately, or not yet due, is not rusty: a 30-day step is meant to be rare.
 */
export function rustyOf(candidates: readonly RustyCandidate[], now: number): RustyItem[] {
  const found = candidates.flatMap((c) => {
    const slips = slipsOf(c.review);
    const overdue = days(now - c.review.due) >= RUSTY_OVERDUE_DAYS;
    if (slips.length === 0 && !overdue) return [];
    const why = slips.length > 0 && (!overdue || slips.some((when) => now - when < RUSTY_SLIP_DAYS * DAY)) ? slipWhy(slips, now) : unseenWhy(c.review, now);
    return [{ c, slips, why }];
  });
  found.sort((a, b) => b.slips.length - a.slips.length || Math.max(0, ...b.slips) - Math.max(0, ...a.slips) || a.c.review.lastWhen - b.c.review.lastWhen);
  return found.slice(0, RUSTY_MAX).map(({ c, why }) => ({ kind: c.kind, id: c.id, title: c.title, why }));
}

/** The solid items past their due date, the most overdue first, at most WELCOME_BACK_ITEMS: what the Welcome back refresher names. */
export function overdueOf(candidates: readonly RustyCandidate[], now: number): RustyCandidate[] {
  return candidates
    .filter((c) => c.review.due <= now)
    .sort((a, b) => a.review.due - b.review.due)
    .slice(0, WELCOME_BACK_ITEMS);
}
