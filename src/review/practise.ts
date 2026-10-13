// src/review/practise.ts — the items the next Review round is to ask first and alone (mw-1vuvq6.6): the rusty ones he moved back to Frontier, or the ones Welcome back
// names. Module state, not a store: it is set a moment before the Review screen opens and taken by the round it starts; a reload drops it, and Review then draws as usual.
import type { ItemRef } from '../data/repositories';

let waiting: ItemRef[] | undefined;

/** Sets the items the next round is made of. */
export function setPractise(items: readonly ItemRef[]): void {
  waiting = items.length > 0 ? [...items] : undefined;
}

/** Whether a round of chosen items waits. */
export const hasPractise = (): boolean => waiting !== undefined;

/** The items the round is made of, once: they are not asked for again. */
export function takePractise(): ItemRef[] | undefined {
  const items = waiting;
  waiting = undefined;
  return items;
}
