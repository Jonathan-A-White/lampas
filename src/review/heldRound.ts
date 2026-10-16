// src/review/heldRound.ts — the Review round he left to see a table (mw-svw421.5): 'See the table' after an ending opens the Paradigms screen, a page of its own, and
// Back returns to Review where he was. Module state, like practise.ts: a reload drops it, and a round held for more than HELD_MS is not his any more.
import type { ReviewItem } from './kinds';

export interface RunningRound {
  status: 'running';
  items: ReviewItem[];
  index: number;
  picked: string | null;
  right: number;
  /** the ideas of the grammar questions he has missed so far, one id for each miss (src/review/moreItems.ts) */
  missed: string[];
}

export const HELD_MS = 30 * 60 * 1000;

let held: { round: RunningRound; at: number } | undefined;

/** Keeps the round he is in the middle of. */
export function holdRound(round: RunningRound, now = Date.now()): void {
  held = { round, at: now };
}

/** The round held and still his, or undefined. */
export function heldRound(now = Date.now()): RunningRound | undefined {
  return held && now - held.at <= HELD_MS ? held.round : undefined;
}

/** Lets go of it: the screen has taken it up. */
export function releaseRound(): void {
  held = undefined;
}
