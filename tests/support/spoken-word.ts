// What the voice is handed for a Greek word said alone, always the Greek voice: lower case (mw-5r3p30.226), and a word of one letter in the form the
// pronunciation he chose gives it (its loneLetter, mw-5r3p30.262). Written out here, not imported from src/speech/greek.ts, so the steps check the rule
// and do not repeat it.
import { chosenPronunciation } from '../../src/speech/greek';

export const asSpoken = (word: string): string => {
  const bare = [...word.normalize('NFD').replace(/\p{M}/gu, '')];
  return bare.length === 1 ? chosenPronunciation().loneLetter(word) : word.toLowerCase();
};

