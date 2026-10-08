// src/data/repositories/grammar.ts — the grammar terms he marked I know this (the Grammar sheet), one row per term. The word sheet
// shows a known term plain; later drills read the list.
import { db } from '../db';

/** The terms he knows, in no particular order. */
export async function listKnownTerms(): Promise<string[]> {
  return (await db.grammarKnown.toArray()).map((row) => row.term);
}

export async function isTermKnown(term: string): Promise<boolean> {
  return (await db.grammarKnown.get(term)) !== undefined;
}

/** Marks a term known (when it was first marked is kept again each time) or takes the mark off. */
export async function setTermKnown(term: string, known: boolean, now = Date.now()): Promise<void> {
  if (known) await db.grammarKnown.put({ term, since: now });
  else await db.grammarKnown.delete(term);
}
