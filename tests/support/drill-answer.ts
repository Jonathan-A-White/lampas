// The answer a drill gives for a stored word (mw-5r3p30.1000): the drill answer of the committed lexicon, as the Quick test and Review ask it, where a step used to read the word's stored gloss.
import { readFileSync } from 'node:fs';
import type { Word } from '../../src/data/db';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { drillGloss } from '../../src/data/quiz';

const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as LemmaLexicon;

/** The gloss the screens ask a word with; undefined for a word he does not have. */
export const drillAnswer = (word: Word | undefined): string | undefined => (word ? drillGloss(word, lexicon) : undefined);
