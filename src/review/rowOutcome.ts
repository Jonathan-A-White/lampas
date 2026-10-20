// src/review/rowOutcome.ts — one outcome for a schedule row in a round (mw-svw421.29). A table is asked up to three cells in a round, each its own item with the table's id; written
// as three answers a few seconds apart, a miss on the first was forgotten by the rights after it (the row went up a step, due in 3 days). A row takes one outcome a round: the
// first answer writes it, a later right leaves it as it is, and a later miss writes the miss over a right (a miss stands, and the cells after it change nothing).
import type { ReviewItem } from './kinds';

/** The outcome each row has had in the round so far, by 'kind\0id': true when only rights were written, false once a miss was. */
export type RowOutcomes = Record<string, boolean>;

const keyOf = (item: Pick<ReviewItem, 'kind' | 'id'>): string => `${item.kind}\0${item.id}`;

/**
 * What to write to the item's schedule row for this answer, and the outcomes after it. `write` is the answer to put on the row, or null to leave the row as it is
 * because an earlier answer of the round already decided it.
 */
export function rowOutcome(before: RowOutcomes | undefined, item: Pick<ReviewItem, 'kind' | 'id'>, right: boolean): { write: boolean | null; outcomes: RowOutcomes } {
  const key = keyOf(item);
  const earlier = before?.[key];
  if (earlier === undefined) return { write: right, outcomes: { ...before, [key]: right } };
  // a miss stands; a right after a right changes nothing; a miss after a right is written
  if (earlier === false || right) return { write: null, outcomes: before ?? {} };
  return { write: false, outcomes: { ...before, [key]: false } };
}
