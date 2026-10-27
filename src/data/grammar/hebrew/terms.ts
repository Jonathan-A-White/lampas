// src/data/grammar/hebrew/terms.ts — the Hebrew parsing terms (mw-gdcyf98.12, PROVISIONAL, docs/grammar.md 'The Hebrew ladder'): the words of the BSB table's parse strings ('Conjunctive waw | Verb - Qal -
// Consecutive imperfect - third person masculine singular', docs/data.md), each tied to the ONE idea of the Hebrew ladder that teaches it. The Greek twin is GRAMMAR_TERMS with ladder.ts `terms`; a Hebrew
// term is written as the table writes it ('Qal', 'Hifil', 'Preposition-b'), a phrase where the table's own words make one term ('Consecutive imperfect'), and a term the Greek parsing writes too
// ('singular', 'masculine') is the Hebrew idea's here. parseCode.ts cuts a Hebrew parsing by this list (hebrewParseSegments); hebrew/ladder.ts fills each idea's `terms` from it; grammar-concepts.ts
// explains each (HEBREW_CONCEPTS). tests/unit/hebrew-parse-terms.test.ts fails on a term met in the Genesis 1 and Jonah 1 fixtures that is not here. Pure data: it imports nothing.

/** Each Hebrew parsing term and the id of the idea it belongs to, in the order of the ladder. */
export const HEBREW_TERM_IDEA: Readonly<Record<string, string>> = {
  // nouns
  Noun: 'he-gender',
  Adjective: 'he-gender',
  masculine: 'he-gender',
  feminine: 'he-gender',
  common: 'he-gender',
  Number: 'he-number',
  ordinal: 'he-number',
  singular: 'he-number',
  plural: 'he-number',
  dual: 'he-number',
  Article: 'he-article',
  determinate: 'he-article',
  proper: 'he-article',
  construct: 'he-construct',
  Pr: 'he-suffix-pronominal',
  // pronouns
  Pronoun: 'he-pronoun-personal',
  'first person': 'he-pronoun-personal',
  'second person': 'he-pronoun-personal',
  'third person': 'he-pronoun-personal',
  relative: 'he-pronoun-relative',
  // prepositions
  Preposition: 'he-prep-inseparable',
  'Preposition-b': 'he-prep-inseparable',
  'Preposition-k': 'he-prep-inseparable',
  'Preposition-l': 'he-prep-inseparable',
  'Preposition-m': 'he-prep-min',
  'Direct object marker': 'he-object-marker',
  'Conjunctive waw': 'he-vav',
  // verbs
  Verb: 'he-root',
  Qal: 'he-qal',
  Perfect: 'he-perfect',
  Imperfect: 'he-imperfect',
  Jussive: 'he-imperfect',
  Cohortative: 'he-imperfect',
  'if contextual': 'he-imperfect',
  Imperative: 'he-imperative',
  Participle: 'he-participle',
  Infinitive: 'he-infinitive',
  'Infinitive construct': 'he-infinitive',
  'Infinitive absolute': 'he-infinitive',
  'Consecutive imperfect': 'he-vav-consecutive',
  'Conjunctive imperfect': 'he-vav-consecutive',
  'Conjunctive perfect': 'he-vav-consecutive',
  Nifal: 'he-stems',
  Piel: 'he-stems',
  Pual: 'he-stems',
  Hifil: 'he-stems',
  Hofal: 'he-stems',
  Hitpael: 'he-stems',
  Nithpael: 'he-stems',
  // joiners
  Conjunction: 'he-conjunctions',
  Adverb: 'he-conjunctions',
  Interjection: 'he-conjunctions',
  'Negative particle': 'he-conjunctions',
  Interrogative: 'he-interrogative',
};

/** Every Hebrew parsing term, once each, in the order of the ladder. */
export const HEBREW_TERMS: readonly string[] = Object.keys(HEBREW_TERM_IDEA);

/** The terms an idea covers: none for most of the letters, sounds and marks. */
export const hebrewTermsOf = (ideaId: string): string[] => HEBREW_TERMS.filter((t) => HEBREW_TERM_IDEA[t] === ideaId);

/** The id of the idea a Hebrew term belongs to, or undefined for a word that is no Hebrew term. */
export const hebrewIdeaOfTerm = (term: string): string | undefined => (Object.hasOwn(HEBREW_TERM_IDEA, term) ? HEBREW_TERM_IDEA[term] : undefined);
