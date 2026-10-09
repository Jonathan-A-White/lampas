// src/data/roundKeep.ts — a half-done Quick test round survives a close (mw-5r3p30.20). The round is ten questions, so it
// is kept whole in localStorage (the Quick test screen reads it synchronously when it opens), and cleared when the round
// ends or he starts a new one.
import type { QuizAnswer } from '../services/talk';
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
  /** his answers to the questions before the one he is on, for the tutor (mw-5r3p30.80); a round kept before this has none */
  answers: QuizAnswer[];
}

const isAnswer = (a: unknown): a is QuizAnswer =>
  typeof a === 'object' &&
  a !== null &&
  typeof (a as QuizAnswer).lemma === 'string' &&
  typeof (a as QuizAnswer).picked === 'string' &&
  typeof (a as QuizAnswer).right === 'boolean';

const isQuestion = (q: unknown): q is Question =>
  typeof q === 'object' &&
  q !== null &&
  typeof (q as Question).lemma === 'string' &&
  typeof (q as Question).prompt === 'string' &&
  typeof (q as Question).gloss === 'string' &&
  Array.isArray((q as Question).options) &&
  (q as Question).options.every((o) => typeof o === 'string');

/** A round kept before the Quick test asked the lemma has a chapter form as its prompt: the form moves to `form`, the prompt becomes the lemma. */
const asLemma = (q: Question): Question =>
  q.form === undefined && q.prompt.normalize('NFC') !== q.lemma.normalize('NFC')
    ? { ...q, prompt: q.lemma.normalize('NFC'), form: q.prompt }
    : q;

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
    const answers = Array.isArray(round.answers) ? round.answers.filter(isAnswer) : [];
    return { questions: round.questions.map(asLemma), index, picked: picked ?? null, missed: round.missed.map(asLemma), answers };
  } catch {
    return null;
  }
}
