// src/data/paradigms/article.ts — the article, ὁ ἡ τό: 4 cases x 3 genders x singular and plural = 24 forms.
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

// The six columns are narrow on a phone: the headings are shortened (the full label is the cell's name).
const SHORT: Record<string, string> = { Masculine: 'Masc.', Feminine: 'Fem.', Neuter: 'Neut.' };

// Each row: the six forms in column order.
const FORMS: string[][] = [
  ['ὁ', 'ἡ', 'τό', 'οἱ', 'αἱ', 'τά'],
  ['τοῦ', 'τῆς', 'τοῦ', 'τῶν', 'τῶν', 'τῶν'],
  ['τῷ', 'τῇ', 'τῷ', 'τοῖς', 'ταῖς', 'τοῖς'],
  ['τόν', 'τήν', 'τό', 'τούς', 'τάς', 'τά'],
];

export const ARTICLE: Paradigm = {
  id: 'article',
  name: 'The article',
  about: 'ὁ ἡ τό, “the”, in every case, gender and number',
  columns: COLUMNS.map(([group, , label]) => ({ group, label, short: SHORT[label] })),
  rows: CASES.map(([label, caseIdea], r) => ({
    label,
    cells: COLUMNS.map(([, numberIdea, , genderIdea], c): ParadigmCell => ({
      form: FORMS[r][c],
      lang: 'el',
      ideas: ['article', caseIdea, genderIdea, numberIdea],
    })),
  })),
};
