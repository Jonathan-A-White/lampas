// src/data/repositories/results.ts — the Quick test's answers, and the state rule applied to a word.
import { db, type TestResult, type WordState } from '../db';
import { nextState } from '../quiz';
import { announceCredited, creditWordRead, type Credited } from './inference';
import { announceDue, writeReview } from './reviews';

export type { TestResult };

/**
 * Stores one answer {lemma, when, right} and moves the word if the answer completes two in a row. Only the
 * answers since the word last got its state count, so a change on the Words screen starts the count again.
 * Also records the answer on the back-off schedule. Returns the word's state afterwards, or null for a lemma that is not in the list.
 */
export async function recordAnswer(lemma: string, right: boolean, now = Date.now()): Promise<WordState | null> {
  let credited: Credited | undefined;
  const state = await db.transaction('rw', db.words, db.results, db.reviews, db.settings, db.grammarLevels, async () => {
    const word = await db.words.get(lemma);
    if (!word) return null;
    const earlier = await db.results.where('[lemma+when]').between([lemma, word.since], [lemma, Infinity]).toArray();
    await db.results.add({ lemma, when: now, right });
    const state = nextState(word.state, [...earlier.map((r) => r.right), right]);
    if (state !== word.state) await db.words.update(lemma, { state, since: now });
    // The answer also moves the word on the back-off schedule (src/data/schedule.ts), in the same transaction.
    await writeReview('word', lemma, right, now);
    // A word read right shows its letters, sounds and marks (src/data/grammar/inference.ts), written in the same transaction.
    if (right) credited = await creditWordRead(lemma, now);
    return state;
  });
  if (state !== null) await announceDue(now);
  if (credited) await announceCredited(credited, now);
  return state;
}

export function listResults(lemma: string): Promise<TestResult[]> {
  return db.results.where('[lemma+when]').between([lemma, -Infinity], [lemma, Infinity]).toArray();
}
