// src/data/wordPartsOfQuestion.ts — which words of a drill question have parts to show once it is answered (mw-5r3p30.987); src/WordParts.tsx draws them.
import type { GrammarQuestion } from './grammar/questions';
import { partsOf } from './wordParts';

/**
 * The words of a drill question whose parts it may show once answered: the word tapped for, the whole form of an ending, the word parsed, the marked words of a 'meaning' and of a 'use'. None
 * for a Hebrew question (Greek first), and none for the compound question, whose prompt already names the parts ('ἐκ + βάλλω makes ἐκβάλλω').
 */
export function wordsOfQuestion(q: GrammarQuestion): string[] {
  if (q.lang === 'hbo' || q.kind === 'compound') return [];
  const words =
    q.kind === 'tap-form' || q.kind === 'roles' || q.kind === 'tap-use'
      ? [q.right]
      : q.kind === 'ending'
        ? [q.word ?? q.lemma]
        : q.kind === 'parse'
          ? [q.form ?? q.lemma]
          : q.kind === 'meaning'
            ? (q.marked ?? [])
            : q.kind === 'use'
              ? (q.markedAt ?? []).map((i) => q.words?.[i])
              : [];
  return [...new Set(words.filter((w): w is string => !!w && !!partsOf(w)))];
}
