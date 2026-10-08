// src/data/drillKeep.ts — a half-done Parsing drill survives a close, and a trip to the Reader to ask the tutor or talk
// about a word (the drill's two links), as roundKeep.ts does for the Quick test. Kept whole in localStorage; the Drill screen
// reads it synchronously when it opens, and clears it when the round ends or he starts a new one.
import type { DrillQuestion } from './drill';

const KEY = 'lampas.drill';

export interface SavedDrill {
  questions: DrillQuestion[];
  /** the word he is on */
  question: number;
  /** the step he is on */
  step: number;
  /** the choice he tapped on that step, or null while he has not answered it */
  picked: string | null;
  /** the words (by position in the round) with a step missed so far */
  missed: number[];
  /** steps answered, and how many of them rightly */
  asked: number;
  right: number;
  /** when he left for the Reader (Ask the tutor, Talk about it), or null: coming back soon, the drill opens on this at once, without asking */
  away: number | null;
}

const isStep = (s: unknown): boolean => {
  const step = s as DrillQuestion['steps'][number];
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof step.id === 'string' &&
    typeof step.label === 'string' &&
    typeof step.right === 'string' &&
    Array.isArray(step.options) &&
    step.options.every((o) => typeof o === 'string') &&
    step.options.includes(step.right)
  );
};

const isQuestion = (q: unknown): q is DrillQuestion => {
  const question = q as DrillQuestion;
  return (
    typeof q === 'object' &&
    q !== null &&
    typeof question.lemma === 'string' &&
    typeof question.form === 'string' &&
    typeof question.reference === 'string' &&
    typeof question.chapter === 'number' &&
    typeof question.verse === 'number' &&
    Array.isArray(question.words) &&
    question.words.every((w) => typeof w === 'string') &&
    Number.isInteger(question.at) &&
    question.at >= 0 &&
    question.at < question.words.length &&
    typeof question.code === 'string' &&
    typeof question.parsing === 'string' &&
    Array.isArray(question.steps) &&
    question.steps.length > 0 &&
    question.steps.every(isStep)
  );
};

function store(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function saveDrill(drill: SavedDrill): void {
  try {
    store()?.setItem(KEY, JSON.stringify(drill));
  } catch {
    // Storage full or refused: the round is not kept, and the next open starts a new one.
  }
}

export function clearDrill(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // As above.
  }
}

const count = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/** The unfinished round, or null when there is none (or what is stored is not a round). */
export function readDrill(): SavedDrill | null {
  try {
    const d = JSON.parse(store()?.getItem(KEY) ?? 'null') as Partial<SavedDrill> | null;
    if (!d || !Array.isArray(d.questions) || d.questions.length === 0 || !d.questions.every(isQuestion)) return null;
    const { question, step, picked, missed, asked, right } = d;
    if (!count(question) || question >= d.questions.length) return null;
    if (!count(step) || step >= d.questions[question].steps.length) return null;
    if (picked !== null && (typeof picked !== 'string' || !d.questions[question].steps[step].options.includes(picked))) return null;
    if (!Array.isArray(missed) || !missed.every((m) => count(m) && m < d.questions!.length)) return null;
    if (!count(asked) || !count(right) || right > asked) return null;
    return { questions: d.questions, question, step, picked: picked ?? null, missed, asked, right, away: count(d.away) ? d.away : null };
  } catch {
    return null;
  }
}
