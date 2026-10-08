// src/data/roundKeep.ts — a half-done Quick test round survives a close (mw-5r3p30.20). The round is ten questions, so it
// is kept whole in localStorage (the Quick test screen reads it synchronously when it opens), and cleared when the round
// ends or he starts a new one.
import type { Question } from './quiz';

const KEY = 'lampas.round';

export interface SavedRound {
  questions: Question[];
  /** the question he is on */
  index: number;
  /** the gloss he tapped on that question, or null while he has not answered it */
  picked: string | null;
  /** the questions he missed so far */
  missed: Question[];
}

const isQuestion = (q: unknown): q is Question =>
  typeof q === 'object' &&
  q !== null &&
  typeof (q as Question).lemma === 'string' &&
  typeof (q as Question).prompt === 'string' &&
  typeof (q as Question).gloss === 'string' &&
  Array.isArray((q as Question).options) &&
  (q as Question).options.every((o) => typeof o === 'string');

function store(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function saveRound(round: SavedRound): void {
  try {
    store()?.setItem(KEY, JSON.stringify(round));
  } catch {
    // Storage full or refused: the round is not kept, and the next open starts a new one.
  }
}

export function clearRound(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // As above.
  }
}

/** The unfinished round, or null when there is none (or what is stored is not a round). */
export function readRound(): SavedRound | null {
  try {
    const round = JSON.parse(store()?.getItem(KEY) ?? 'null') as Partial<SavedRound> | null;
    if (!round || !Array.isArray(round.questions) || !round.questions.every(isQuestion)) return null;
    if (!Array.isArray(round.missed) || !round.missed.every(isQuestion)) return null;
    const { index, picked } = round;
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= round.questions.length) return null;
    if (picked !== null && typeof picked !== 'string') return null;
    if (picked !== null && !round.questions[index].options.includes(picked)) return null;
    return { questions: round.questions, index, picked: picked ?? null, missed: round.missed };
  } catch {
    return null;
  }
}
