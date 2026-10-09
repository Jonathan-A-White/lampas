// src/data/grammar/move.ts — when New words at should move, from how his last grammar answers went (mw-hqd5bz.11). Pure.
// PROVISIONAL (the Governor to confirm): the window of 20 answers, 85 percent up, under 60 percent down.
import type { PickerGrammar } from './formLevel';

/** How many of his latest grammar answers the rule looks at; with fewer than this it never moves. */
export const MOVE_WINDOW = 20;
/** The share of the window that is right at or above which Solid grammar moves up to Frontier grammar. */
export const MOVE_UP = 0.85;
/** The share of the window that is right below which Frontier grammar moves down to Solid grammar. */
export const MOVE_DOWN = 0.6;

/** Whether the app asks before it moves New words at (Ask, the default), moves it and says so (Auto), or never moves it (Off). */
export type GrammarMove = 'ask' | 'auto' | 'off';

export const GRAMMAR_MOVES: readonly GrammarMove[] = ['ask', 'auto', 'off'];

export type Move = 'up' | 'down' | 'none';

/**
 * Whether `level` should move, from `answers` (right or not, oldest first; only the last MOVE_WINDOW count): 'up' from solid
 * when at least MOVE_UP of them are right, 'down' from frontier when under MOVE_DOWN are, else 'none', and always 'none'
 * with fewer than MOVE_WINDOW answers.
 */
export function moveFor(level: PickerGrammar, answers: readonly boolean[]): Move {
  if (answers.length < MOVE_WINDOW) return 'none';
  const right = answers.slice(-MOVE_WINDOW).filter(Boolean).length;
  // counts against the window, without dividing, so 17 of 20 is exactly 85 percent
  if (level === 'solid') return right * 100 >= MOVE_UP * 100 * MOVE_WINDOW ? 'up' : 'none';
  return right * 100 < MOVE_DOWN * 100 * MOVE_WINDOW ? 'down' : 'none';
}

/** The level a move goes to: up is Frontier grammar, down is Solid grammar. */
export const movedTo = (move: Exclude<Move, 'none'>): PickerGrammar => (move === 'up' ? 'frontier' : 'solid');
