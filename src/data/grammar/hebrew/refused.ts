// src/data/grammar/hebrew/refused.ts — the questions that cannot be drawn in Hebrew (mw-gdcyf98.21). A question builder of questions.ts that is written for Greek calls refuseHebrew first: asked about a
// Hebrew idea (an id that starts 'he-') it throws with its reason, so a Hebrew idea is never asked a Greek question by mistake. The Hebrew ideas are asked by hebrew/wordQuestions.ts and the letter questions.
import type { GrammarIdea } from '../ladder';
import { isHebrewIdeaId } from './ladder';

/** The kinds of question that are refused for a Hebrew idea, each with the reason: what the closing comment of mw-gdcyf98.21 lists. */
export const HEBREW_REFUSED: Readonly<Record<string, string>> = {
  'the sound rule of a word': 'a Greek word is respelled by the pronunciation scheme (ruleWord.ts); a Hebrew word is sounded by the Israeli scheme, which has no rule facet to ask yet',
  'movable letters': 'the movable ν, ς and the dropped vowel are Greek spelling; Hebrew has no letter that moves',
  'stress and syllables': 'Greek accents mark the stress and its syllables are cut by Greek rules; a Hebrew word is cut by the ladder\'s own syllable idea',
  'breathings': 'a breathing is a Greek mark; Hebrew has none',
  'the iota subscript': 'the iota subscript is a Greek mark; Hebrew has none',
  'Greek punctuation': 'the Greek question mark and raised dot are Greek; Hebrew ends a verse with the sof pasuq',
  'marks that change a word': 'it compares Greek words that differ by one accent',
  'enclitics': 'an enclitic is a Greek word without its own accent',
  'words that sound alike': 'it compares Greek spellings under the chosen Greek pronunciation',
  'a preposition by its case': 'a Greek preposition governs cases; Hebrew has none',
  'a compound verb': 'it splits a Greek verb into its preposition and root',
};

/** Throws when `idea` is Hebrew: `kind` is a key of HEBREW_REFUSED. */
export function refuseHebrew(idea: GrammarIdea, kind: keyof typeof HEBREW_REFUSED | string): void {
  if (isHebrewIdeaId(idea.id)) throw new Error(`${kind} is not asked of the Hebrew idea ${idea.id}: ${HEBREW_REFUSED[kind] ?? 'it is a Greek question'}`);
}
