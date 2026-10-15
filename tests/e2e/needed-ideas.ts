// The grammar ideas 1 John 1:1 needs (src/data/grammar/needs.ts passageNeeds), as the placement and goal specs mark them solid: a preposition it uses (ἀπό, περί) needs its own idea too.
// tests/unit/e2e-needed-ideas.test.ts holds this list to what the app works out, so a ladder that grows fails the gate and not only the e2e run.
export const NEEDED = [
  'alphabet', 'diphthongs', 'consonant-pairs', 'syllables', 'breathings', 'accents', 'iota-subscript', 'punctuation',
  'noun', 'number-singular', 'number-plural', 'conjunction', 'case-nominative', 'stem-and-ending', 'case-accusative', 'case-genitive',
  'case-dative', 'gender-masculine', 'gender-feminine', 'gender-neuter', 'declension-1', 'declension-2', 'article', 'declension-3',
  'person-1st', 'person-3rd', 'pronoun', 'pronoun-personal', 'pronoun-relative', 'preposition', 'preposition-apo', 'preposition-peri',
  'verb', 'eimi', 'voice-active', 'mood-indicative', 'contract-verbs', 'tense-imperfect', 'tense-aorist', 'augment',
  'tense-perfect', 'reduplication', 'second-tenses', 'tense-signs', 'voice-middle-deponent', 'attic-form',
];
