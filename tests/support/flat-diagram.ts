// tests/support/flat-diagram.ts — a valid diagram for ANY request the sentence-diagram grind is sent (mw-5r3p30.897): the fake mill's answer when a test is about WHICH words are asked for and
// drawn, not about the grammar. The first word is the subject, the second the verb, every word after it a modifier of the verb, so THE RULE (every word once) holds for any list of words.
import type { Diagram, Modifier } from '../../src/diagram/types';

export function flatDiagram(input: Record<string, unknown>): Diagram {
  const words = (input.words as { i: number }[]) ?? [];
  const one = words.length === 1;
  const modifiers: Modifier[] = words.slice(2).map((w) => ({ kind: 'word', word: { i: w.i }, modifiers: [] }));
  return {
    clauses: [
      {
        clause: {
          subject: { words: [one ? { implied: 'it' } : { i: words[0].i }], modifiers: [] },
          verb: { words: [{ i: words[one ? 0 : 1].i }], modifiers },
        },
      },
    ],
  };
}
