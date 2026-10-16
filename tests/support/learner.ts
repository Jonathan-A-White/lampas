// tests/support/learner.ts — what the tutor features share about the learner summary (src/data/learnerSummary.ts): putting a word
// he added today on his list, checking the 'learner' field of a grist the fake mill opened, and reading a grind's instructions.
import { expect, vi } from 'vitest';
import { db } from '../../src/data/db';

/**
 * Freezes the clock (Date only: Dexie and the timers still run) at noon of the current local day, so "today" cannot end between
 * a word being put and the request being sent (mw-5r3p30.180: a gate that ran across midnight failed). Undo with vi.useRealTimers().
 */
export function pinClockAtNoon(): void {
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  vi.useFakeTimers({ toFake: ['Date'], now: noon });
}

/** Puts `lemma` on his list as a word he is learning, added just now, with the clock pinned at noon (see pinClockAtNoon). */
export async function learnWordToday(lemma: string): Promise<void> {
  pinClockAtNoon();
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

/** A grind's instructions whole (scripts/grind-parts.ts: its parts joined as the mill joins them). */
export { instructionsOf } from '../../scripts/grind-parts';

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
