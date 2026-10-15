// src/data/paradigms/adjectiveEndings.ts — the adjective in three genders: ἀγαθός -ή -όν (first and second declension) and πᾶς πᾶσα πᾶν
// (third declension in the masculine and neuter, first in the feminine); 4 cases x 3 genders x singular and plural, 24 each = 48 forms
// (mw-svw421.2). PROVISIONAL (the Governor to confirm which adjectives the table holds). Full forms, so the accent shows.
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

// [group heading, the declension idea of each of the six columns, four rows of six forms in column order]
const ADJECTIVES: [string, string[], string[][]][] = [
  [
    'ἀγαθός -ή -όν',
    ['declension-2', 'declension-1', 'declension-2', 'declension-2', 'declension-1', 'declension-2'],
    [
      ['ἀγαθός', 'ἀγαθή', 'ἀγαθόν', 'ἀγαθοί', 'ἀγαθαί', 'ἀγαθά'],
      ['ἀγαθοῦ', 'ἀγαθῆς', 'ἀγαθοῦ', 'ἀγαθῶν', 'ἀγαθῶν', 'ἀγαθῶν'],
      ['ἀγαθῷ', 'ἀγαθῇ', 'ἀγαθῷ', 'ἀγαθοῖς', 'ἀγαθαῖς', 'ἀγαθοῖς'],
      ['ἀγαθόν', 'ἀγαθήν', 'ἀγαθόν', 'ἀγαθούς', 'ἀγαθάς', 'ἀγαθά'],
    ],
  ],
  [
    'πᾶς πᾶσα πᾶν',
    ['declension-3', 'declension-1', 'declension-3', 'declension-3', 'declension-1', 'declension-3'],
    [
      ['πᾶς', 'πᾶσα', 'πᾶν', 'πάντες', 'πᾶσαι', 'πάντα'],
      ['παντός', 'πάσης', 'παντός', 'πάντων', 'πασῶν', 'πάντων'],
      ['παντί', 'πάσῃ', 'παντί', 'πᾶσι(ν)', 'πάσαις', 'πᾶσι(ν)'],
      ['πάντα', 'πᾶσαν', 'πᾶν', 'πάντας', 'πάσας', 'πάντα'],
    ],
  ],
];

export const ADJECTIVE_ENDINGS: Paradigm = {
  id: 'adjective-endings',
  name: 'Adjective endings',
  about: 'ἀγαθός -ή -όν and πᾶς πᾶσα πᾶν in every case, gender and number',
  ideas: ['adjective'],
  tier: 'nouns',
  columns: COLUMNS.map(([group, , label]) => ({ group, label, short: SHORT[label] })),
  rows: ADJECTIVES.flatMap(([group, declensions, forms]) =>
    CASES.map(([label, caseIdea], r) => ({
      group,
      label,
      cells: COLUMNS.map(([, numberIdea, , genderIdea], c): ParadigmCell => ({
        form: forms[r][c],
        lang: 'el',
        ideas: ['adjective', declensions[c], caseIdea, genderIdea, numberIdea],
      })),
    })),
  ),
};
