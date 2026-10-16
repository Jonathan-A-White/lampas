// tests/support/lone-word.ts — what the Greek voice is handed for a Greek word said alone, written out here, not imported from src/speech/, so a test checks the
// rule and does not repeat it (tests/support/spoken-word.ts for the feature steps; the e2e specs import this file, which needs no vitest). A word of ONE
// letter goes as its bare vowel doubled ('οο' for ὁ, mw-5r3p30.421); any other in lower case, in monotonic marks (one tonos, the first accent; no breathing,
// no iota under a letter), its last stop '!' (mw-5r3p30.357: the '!' keeps a voice's pitch peak on the stressed syllable).

const bare = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '');

/** One letter, whatever marks it carries (ὁ, Ὃ, ἡ). */
export const isOneLetter = (word: string): boolean => [...bare(word)].length === 1;

/** `word` with one tonos where its first accent (acute, grave or circumflex) was, its breathings and iota under a letter gone, a diaeresis kept. */
const monotonic = (word: string): string => {
  let stressed = false;
  let out = '';
  for (const c of word.normalize('NFD')) {
    if (!/\p{M}/u.test(c)) out += c;
    else if (c === '\u0308') out += c;
    else if ('\u0300\u0301\u0342'.includes(c) && !stressed) {
      out += '\u0301';
      stressed = true;
    }
  }
  return out.normalize('NFC');
};

/** What the Greek voice is handed for `word` said alone: lower case, and a word of one letter (a vowel) its bare letter doubled; any other in monotonic
 * marks, its last stop '!'. */
export const asSpoken = (word: string): string => {
  const lower = word.toLowerCase();
  return isOneLetter(word) ? bare(lower).repeat(2) : `${monotonic(lower).replace(/[\s.,;:·!?]+$/u, '')}!`;
};

