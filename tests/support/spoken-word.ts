// What the voice is handed for a Greek word said alone: lower case, and a word of one letter as its bare vowel (mw-5r3p30.226).
// Written out here, not imported from src/speech/greek.ts, so the steps check the rule and do not repeat it.
export const asSpoken = (word: string): string => {
  const lower = word.toLowerCase();
  return [...lower].length === 1 ? lower.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC') : lower;
};
