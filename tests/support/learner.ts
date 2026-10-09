// tests/support/learner.ts — what the tutor features share about the learner summary (src/data/learnerSummary.ts): putting a word
// he added today on his list, checking the 'learner' field of a grist the fake mill opened, and reading a grind's instructions.
import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { db } from '../../src/data/db';

/** Puts `lemma` on his list as a word he is learning, added just now. */
export async function learnWordToday(lemma: string): Promise<void> {
  await db.words.put({ lemma, lemmas: [], gloss: 'flesh', lesson: 0, state: 'learning', since: Date.now() });
}

/** The 'learner' field of a grist's input must name the solid count, `lemma` as learning and as new today, and what is due. */
export async function expectLearnerSummary(input: Record<string, unknown>, lemma: string): Promise<void> {
  const solid = await db.words.where('state').equals('solid').count();
  expect(solid).toBeGreaterThan(0);
  const learner = input.learner;
  expect(typeof learner).toBe('string');
  const text = learner as string;
  expect(text.length).toBeLessThanOrEqual(600);
  expect(text).toContain(`solid ${solid} words`);
  expect(text).toMatch(new RegExp(`learning: [^;]*${lemma}`));
  expect(text).toMatch(new RegExp(`new today: [^;]*${lemma}`));
  expect(text).toMatch(/due now: \d+$/);
}

export const instructionsOf = (kind: 'verse-ask' | 'bible-talk'): string => readFileSync(`grinds/${kind}.instructions.md`, 'utf8');

/** The instructions describe the request's `learner` field. */
export const expectLearnerField = (text: string): void => expect(text).toContain('`learner`');

/** The instructions ask for a new word to be taught with its gloss, a memorable hook and one easy example (case blind). */
export function expectTeachesNewWord(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of ['new word', 'gloss', 'memorable hook', 'one easy example']) expect(lower).toContain(phrase);
}

/** The instructions say to leave out what he already knows and to keep the answer short for a phone (case blind). */
export function expectKeepsItShort(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of ['already know', 'short', 'phone']) expect(lower).toContain(phrase);
}
