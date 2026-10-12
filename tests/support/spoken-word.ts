// What the voice is handed for a Greek word said alone: lower case (mw-5r3p30.226), and a word of one letter as its sound, the respell (mw-5r3p30.256).
// Written out here, not imported from src/speech/greek.ts, so the steps check the rule and do not repeat it.
import { chosenPronunciation } from '../../src/speech/greek';

export const asSpoken = (word: string): string => {
  const lower = word.toLowerCase();
  return [...lower].length === 1 ? chosenPronunciation().respell(lower).toLowerCase() : lower;
};

/** The language tag the voice is told for a Greek word said alone: the Greek one, but English for a word of one letter, which is said as its sound. */
export const spokenLang = (word: string, greekLang = 'el-GR'): string => (asSpoken(word) === word.toLowerCase() ? greekLang : 'en-US');
