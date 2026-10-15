// src/data/paradigms/pronounsDemonstrativeRelative.ts — the demonstrative οὗτος “this” and the relative ὅς “who, which”: 4 cases x 3 genders x
// singular and plural, 24 each = 48 forms (mw-svw421.2). PROVISIONAL (the Governor to confirm which pronouns the table holds).
import type { Paradigm, ParadigmCell } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
] as const;

// [number, number idea, gender, gender idea]; the order of the six columns.
const COLUMNS = [
  ['Singular', 'number-singular', 'Masculine', 'gender-masculine'],
  ['Singular', 'number-singular', 'Feminine', 'gender-feminine'],
  ['Singular', 'number-singular', 'Neuter', 'gender-neuter'],
  ['Plural', 'number-plural', 'Masculine', 'gender-masculine'],
  ['Plural', 'number-plural', 'Feminine', 'gender-feminine'],
  ['Plural', 'number-plural', 'Neuter', 'gender-neuter'],
] as const;

const SHORT: Record<string, string> = { Masculine: 'Masc.', Feminine: 'Fem.', Neuter: 'Neut.' };

// [group heading, the pronoun's idea, four rows of six forms in column order]
const PRONOUNS: [string, string, string[][]][] = [
  [
    'οὗτος, this',
    'pronoun-demonstrative',
    [
      ['οὗτος', 'αὕτη', 'τοῦτο', 'οὗτοι', 'αὗται', 'ταῦτα'],
      ['τούτου', 'ταύτης', 'τούτου', 'τούτων', 'τούτων', 'τούτων'],
      ['τούτῳ', 'ταύτῃ', 'τούτῳ', 'τούτοις', 'ταύταις', 'τούτοις'],
      ['τοῦτον', 'ταύτην', 'τοῦτο', 'τούτους', 'ταύτας', 'ταῦτα'],
    ],
  ],
  [
    'ὅς, who or which',
    'pronoun-relative',
    [
      ['ὅς', 'ἥ', 'ὅ', 'οἵ', 'αἵ', 'ἅ'],
      ['οὗ', 'ἧς', 'οὗ', 'ὧν', 'ὧν', 'ὧν'],
      ['ᾧ', 'ᾗ', 'ᾧ', 'οἷς', 'αἷς', 'οἷς'],
      ['ὅν', 'ἥν', 'ὅ', 'οὕς', 'ἅς', 'ἅ'],
    ],
  ],
];

export const PRONOUNS_DEMONSTRATIVE_RELATIVE: Paradigm = {
  id: 'pronouns-demonstrative-relative',
  name: 'Demonstrative and relative pronouns',
  about: 'οὗτος “this” and ὅς “who, which” in every case, gender and number',
  ideas: ['pronoun-demonstrative', 'pronoun-relative'],
  tier: 'pronouns',
  columns: COLUMNS.map(([group, , label]) => ({ group, label, short: SHORT[label] })),
  rows: PRONOUNS.flatMap(([group, pronounIdea, forms]) =>
    CASES.map(([label, caseIdea], r) => ({
      group,
      label,
      cells: COLUMNS.map(([, numberIdea, , genderIdea], c): ParadigmCell => ({
        form: forms[r][c],
        lang: 'el',
        ideas: [pronounIdea, caseIdea, genderIdea, numberIdea],
      })),
    })),
  ),
};
