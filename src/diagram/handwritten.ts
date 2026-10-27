// src/diagram/handwritten.ts — the little builders a diagram written by hand is made of (the diagram lesson's steps, lesson.ts, and a grammar card's
// diagram, src/data/grammar/teach/): pure, so grammar data can draw a diagram without naming the lesson.
import type { DiagramWords, Modifier, Slot, TokenRef } from './types';

/** Word `i` of the diagram's words. */
export const w = (i: number): TokenRef => ({ i });
/** A slot of these words, with these modifiers hanging under it. */
export const slot = (words: number[], modifiers: Modifier[] = []): Slot => ({ words: words.map(w), modifiers });
/** Word `i` on a slanted line under the word it modifies, its own modifiers under it. */
export const hang = (i: number, modifiers: Modifier[] = []): Modifier => ({ kind: 'word', word: w(i), modifiers });
/** A preposition and its object. */
export const prep = (preposition: number, object: Slot): Modifier => ({ kind: 'prepositional', preposition: w(preposition), object });
/** A slot of one understood word ('you' of a command, the subject a Greek verb's ending carries). */
export const understood = (word: string): Slot => ({ words: [{ implied: word }], modifiers: [] });
/** English words, one chunk each. */
export const english = (...texts: string[]): DiagramWords => texts.map((text, chunk) => ({ text, chunk }));
/** The verse's Greek words, each its index in the verse and its text as the verse has it (marks stripped, src/diagram/request.ts). */
export const greek = (...words: [word: number, text: string][]): DiagramWords => words.map(([word, text]) => ({ text, word }));
