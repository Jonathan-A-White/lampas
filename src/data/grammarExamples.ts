// src/data/grammarExamples.ts — the examples a Grammar sheet shows: words of the chapter whose parsing has the term.
import type { Chapter, GreekWord } from './chapter';
import { parseSegments } from './parseCode';

export interface GrammarExample {
  word: GreekWord;
  /** the verse it stands in */
  verse: number;
}

export const MAX_EXAMPLES = 3;

/** Up to `max` words of `chapter` whose parsing has `term`, one word for each lemma, in the order of the text. `term` is matched
 * as a whole term, so middle does not find 'middle or passive'. The lemma of `except` (the word he is looking at) is left out:
 * it is no example of itself. */
export function grammarExamples(chapter: Chapter, term: string, except?: GreekWord, max = MAX_EXAMPLES): GrammarExample[] {
  const has = new Map<string, boolean>();
  const hasTerm = (code: string): boolean => {
    let found = has.get(code);
    if (found === undefined) {
      found = parseSegments(chapter.parse[code] ?? '').some((s) => s.term === term);
      has.set(code, found);
    }
    return found;
  };
  const chosen: GrammarExample[] = [];
  const lemmas = new Set<string>(except ? [except.l] : []);
  for (const verse of chapter.verses) {
    for (const word of verse.g) {
      if (chosen.length >= max) return chosen;
      if (!hasTerm(word.p) || lemmas.has(word.l)) continue;
      lemmas.add(word.l);
      chosen.push({ word, verse: verse.n });
    }
  }
  return chosen;
}
