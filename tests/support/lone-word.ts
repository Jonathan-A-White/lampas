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

/** `text` with the υ of each αυ, ευ and ηυ written as the v (β) or f (φ) it is said as (mw-5r3p30.647), written out here as the rule is: v before a vowel or a
 * voiced consonant (βγδζλμνρ), f anywhere else; the υ's accent goes to the vowel before it, its breathing goes; a pair with a diaeresis on the υ or an accent
 * on the first vowel is two vowels and stays. A reading's Greek is handed to the voice so, its other marks as they are. */
export const pairsAsConsonant = (text: string): string =>
  text.normalize('NFD').replace(/[\p{Script=Greek}\p{M}]+/gu, (word) => {
    const letters: { base: string; marks: string }[] = [];
    for (const c of word) {
      if (/\p{M}/u.test(c) && letters.length > 0) letters[letters.length - 1].marks += c;
      else letters.push({ base: c, marks: '' });
    }
    letters.forEach((letter, i) => {
      const before = letters[i - 1];
      if (letter.base.toLowerCase() !== 'υ' || !before || !'αεη'.includes(before.base.toLowerCase())) return;
      if (letter.marks.includes('\u0308') || /[\u0300\u0301\u0342]/u.test(before.marks)) return;
      const next = letters[i + 1]?.base.toLowerCase();
      const voiced = next !== undefined && 'βγδζλμνρ'.includes(next);
      const vowel = next !== undefined && 'αεηιουω'.includes(next);
      before.marks += letter.marks.replace(/[^\u0300\u0301\u0342]/gu, '');
      letter.base = (voiced || vowel ? 'β' : 'φ');
      letter.marks = '';
    });
    return letters.map((l) => l.base + l.marks).join('');
  }).normalize('NFC');

/** What the Greek voice is handed for `word` said alone: lower case, and a word of one letter (a vowel) its bare letter doubled; any other in monotonic
 * marks, its last stop '!'. */
export const asSpoken = (word: string): string => {
  const lower = word.toLowerCase();
  return isOneLetter(word) ? bare(lower).repeat(2) : `${monotonic(pairsAsConsonant(lower)).replace(/[\s.,;:·!?]+$/u, '')}!`;
};

