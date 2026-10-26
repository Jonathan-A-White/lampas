// src/data/lemma.ts — BMA's dictionary shows a lemma with its endings and hints ('ἄνθρωπος, -ου, ὁ',
// 'οὐ (οὐκ, οὐχ, οὐχί)', 'ἐκ, ἐξ + gen'). The store keeps the plain headword; the lexicon lemmas are what
// STEPBible's TBESG (and so the reader's weave) call the same word.

export interface NormalisedLemma {
  /** The plain headword as the learner knows it: 'ἄνθρωπος', 'εἰ μή'. The key of the word store. */
  headword: string;
  /** The lemma or lemmas the lexicon uses for it; the first is the lexicon's main entry. Never empty. */
  lemmas: string[];
}

/** Where a BMA lemma stops being the headword: the first comma, the first '(' or a '+' (as in '+ gen'). */
const HEADWORD_END = /[,(+]/;

/** Whether the text holds a Hebrew letter or point (the Hebrew block, U+0590 to U+05FF): a pointed Hebrew headword, which is the language of the word. */
export const isHebrewText = (text: string): boolean => /[\u0590-\u05FF]/.test(text);

/** The language a headword is in: 'hbo' when it holds Hebrew, else 'grc'. */
export const languageOfLemma = (lemma: string): 'grc' | 'hbo' => (isHebrewText(lemma) ? 'hbo' : 'grc');

/**
 * NFC, then the headword before the first comma, parenthesised hint or '+ case' hint; accents and breathings stay. A pointed Hebrew headword is
 * kept whole (white space made one space): TBESH's own headword can hold a comma, 'יְרוּשָׁלִַ֫ם, יְרוּשְׁלֵם', or a maqaf, 'מִן־', and is the key of the word.
 */
export function normaliseHeadword(raw: string): string {
  if (isHebrewText(raw)) return raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  const head = raw.normalize('NFC').split(HEADWORD_END, 1)[0] ?? '';
  return head.replace(/\s+/g, ' ').trim();
}

// Headwords whose lexicon lemma is not simply themselves. TBESG was not in the repo when this was
// written, so these come from the lexicon's known entries; the weave story checks them against it.
const LEXICON_LEMMAS: Record<string, string[]> = {
  // εἶπεν is the aorist of λέγω; the lexicon lists the aorist stem as its own entry εἶπον.
  'εἶπεν': ['λέγω', 'εἶπον'],
  // Two lexicon entries, not one.
  'εἰ μή': ['εἰ', 'μή'],
  // ἐξ is ἐκ before a vowel; the word lists carry both.
  'ἐκ': ['ἐκ', 'ἐξ'],
  // οὐκ and οὐχ are forms of οὐ; οὐχί is the lexicon's own entry.
  'οὐ': ['οὐ', 'οὐχί'],
  // μου and ἐμοῦ are the genitive of ἐγώ, which the lexicon may list under any of the three.
  'μου': ['ἐγώ', 'ἐμοῦ', 'μου'],
};

/** The lexicon lemma or lemmas for a headword (see normaliseHeadword). */
export function lexiconLemmas(headword: string): string[] {
  const key = headword.normalize('NFC');
  return (LEXICON_LEMMAS[key] ?? [key]).map((l) => l.normalize('NFC'));
}

/** A BMA lemma as shown, or a pasted one: its headword and the lexicon lemmas that match it. */
export function normaliseLemma(raw: string): NormalisedLemma {
  const headword = normaliseHeadword(raw);
  return { headword, lemmas: headword ? lexiconLemmas(headword) : [] };
}
