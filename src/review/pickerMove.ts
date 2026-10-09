// src/review/pickerMove.ts — the move of New words at that Review's end card offers or makes (mw-hqd5bz.11): the rule is
// src/data/grammar/move.ts, the setting 'pickerGrammar' (src/settings/registry.ts), the answers the ring in the settings store.
import { clearGrammarAnswers, getGrammarAnswers, getGrammarMove, getPickerGrammar, type PickerGrammar } from '../data/repositories';
import { moveFor, movedTo } from '../data/grammar/move';
import { publish } from '../events/bus';
import { writeSetting } from '../settings/registry';

/** A move the rule asks for: where New words at would go, and whether to ask first or just make it. */
export interface PendingMove {
  to: PickerGrammar;
  how: 'ask' | 'auto';
}

/** The move his last grammar answers call for under his Move it setting, or null: Off, too few answers, or nothing to change. */
export async function pendingMove(): Promise<PendingMove | null> {
  const [mode, level, answers] = await Promise.all([getGrammarMove(), getPickerGrammar(), getGrammarAnswers()]);
  if (mode === 'off') return null;
  const move = moveFor(level, answers);
  return move === 'none' ? null : { to: movedTo(move), how: mode };
}

/** Moves New words at to `to` through the registry, forgets the answers that judged the old level, and tells the bus. */
export async function makeMove({ to, how }: PendingMove): Promise<void> {
  await writeSetting('pickerGrammar', to);
  await clearGrammarAnswers();
  publish({ kind: 'picker-level-moved', level: to, how });
}

/** 'Move new words to frontier grammar?' */
export const moveQuestion = (to: PickerGrammar): string => `Move new words to ${to} grammar?`;

/** 'Moved new words to frontier grammar' */
export const moveSaid = (to: PickerGrammar): string => `Moved new words to ${to} grammar`;
