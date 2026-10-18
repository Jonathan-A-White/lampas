// src/hardSounds/pairDrill.ts — 'Which did you hear?' (mw-5r3p30.362, PROVISIONAL, the Governor to confirm): the drill of a Hard sounds lesson's contrast step. The Greek voice
// says one word of one of the lesson's pairs, he taps which of the two it was. Ten rounds in random order, a score at the end, and the pair of every miss comes back side by
// side. Pure: no screen, no store (./Contrast.tsx is the screen; data/repositories/pairDrills.ts keeps the runs).
import { shuffle, type Random } from '../data/random';

/** How many rounds a run has. */
export const ROUNDS = 10;

/** The random source the screen draws with: Math.random in the app, a seeded one in a feature step (as src/ipa/seed.ts). */
export const pairSeed: { next: Random } = { next: () => Math.random() };

export interface Round {
  /** the word the voice says */
  said: string;
  /** the other word of its pair */
  other: string;
  /** the two words as the buttons show them, in either order */
  choices: [string, string];
}

export interface PairAnswer {
  said: string;
  other: string;
  /** the word he tapped */
  chose: string;
  right: boolean;
}

/** A finished run, as it is kept. */
export interface PairRun {
  lessonId: string;
  /** when it was finished, ms since the epoch */
  at: number;
  total: number;
  score: number;
  answers: PairAnswer[];
}

/** A pair he missed: the word that was said, its other, and the one he took it for. */
export interface Miss {
  said: string;
  other: string;
  chose: string;
}

/** `n` rounds from `pairs`: each word of each pair is said as often as the others, in random order, never the same word twice running when another can be said, and the
 * two words on the buttons in either order. None for a lesson with no pairs. */
export function drawRounds(pairs: readonly (readonly [string, string])[], random: Random, n = ROUNDS): Round[] {
  const all = pairs.flatMap(([a, b]) => [
    { said: a, other: b },
    { said: b, other: a },
  ]);
  if (all.length === 0) return [];
  const rounds: Round[] = [];
  let bag: typeof all = [];
  while (rounds.length < n) {
    if (bag.length === 0) bag = shuffle(all, random);
    const previous = rounds[rounds.length - 1]?.said;
    const at = Math.max(0, bag.findIndex((c) => c.said !== previous));
    const [{ said, other }] = bag.splice(at, 1);
    rounds.push({ said, other, choices: random() < 0.5 ? [said, other] : [other, said] });
  }
  return rounds;
}

/** What tapping `chose` answers. */
export const answerRound = (round: Round, chose: string): PairAnswer => ({ said: round.said, other: round.other, chose, right: chose === round.said });

/** A finished run's record. */
export const resultOf = (lessonId: string, answers: readonly PairAnswer[], at: number): PairRun => ({
  lessonId,
  at,
  total: answers.length,
  score: answers.filter((a) => a.right).length,
  answers: [...answers],
});

/** The pairs he missed, each once (the first time he missed it), in the order he missed them. */
export function missesOf(answers: readonly PairAnswer[]): Miss[] {
  const seen = new Set<string>();
  const misses: Miss[] = [];
  for (const a of answers) {
    if (a.right) continue;
    const key = [a.said, a.other].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    misses.push({ said: a.said, other: a.other, chose: a.chose });
  }
  return misses;
}
