// src/review/asksToTap.ts — which grammar questions are never a flashcard (mw-5r3p30.984, PROVISIONAL). A question whose prompt tells him to tap what is on the card ('Tap the word that
// means ...', 'Tap to hear a letter, then tap it') is answered by that tap, so Show and a self-grade would add nothing: it stays its buttons at every strength, and the tap grades it
// (a right one counts as I knew it, a wrong one as Not yet). Like a full parsing (kind 'parse'), which is asked step by step.
import type { GrammarQuestion } from '../data/grammar/questions';
import { modeFor, type QuestionMode } from '../data/schedule';

/** Whether a prompt sends him to tap something ('Tap the word that means ...', 'Hear it, then tap it'): a 'Tap to hear' alone sends him to the speaker, not to an answer. */
export const tellsToTap = (prompt: string): boolean => /\btap\b/i.test(prompt.replace(/\btap to hear\b/gi, ''));

/**
 * Whether the question is answered by tapping what is drawn on its card: the words of a verse (tap-form, roles, tap-use), or any question with choices whose prompt tells him to tap
 * (a sound's glyphs, how a word heard is spelt). The prompt decides for the rest, so a new kind that says 'tap' is covered; tests/unit/tap-prompts-never-flashcard.test.ts sweeps them all.
 */
export const asksToTap = (q: GrammarQuestion): boolean => q.options.length > 0 && (q.kind === 'tap-form' || q.kind === 'roles' || q.kind === 'tap-use' || tellsToTap(q.prompt));

/** The mode a question is drawn in: a flashcard only when its step gives one and it is not asked by a tap, a full parsing or a question to tap. */
export const modeOfQuestion = (q: GrammarQuestion, mode: QuestionMode): QuestionMode => (q.kind === 'parse' || asksToTap(q) ? 'choice' : mode);

/** The mode a new draw is asked in, from the step of its idea. */
export const modeForQuestion = (q: GrammarQuestion, step: number): QuestionMode => modeOfQuestion(q, modeFor(step));
