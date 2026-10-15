// src/data/paradigms/thirdDeclension.ts — the third declension: six nouns x 4 cases x singular and plural = 48 forms (mw-svw421.2).
// PROVISIONAL (the Governor to confirm which nouns the table holds). The stem changes in the third declension (σάρξ, σαρκός), so each
// cell is the full form, not an ending.
import type { Paradigm } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
] as const;

// [group heading, gender idea, 4 singular forms, 4 plural forms] in the order of CASES.
const NOUNS: [string, string, string[], string[]][] = [
  ['σάρξ, feminine', 'gender-feminine', ['σάρξ', 'σαρκός', 'σαρκί', 'σάρκα'], ['σάρκες', 'σαρκῶν', 'σαρξί(ν)', 'σάρκας']],
  ['πνεῦμα, neuter', 'gender-neuter', ['πνεῦμα', 'πνεύματος', 'πνεύματι', 'πνεῦμα'], ['πνεύματα', 'πνευμάτων', 'πνεύμασι(ν)', 'πνεύματα']],
  ['πίστις, feminine', 'gender-feminine', ['πίστις', 'πίστεως', 'πίστει', 'πίστιν'], ['πίστεις', 'πίστεων', 'πίστεσι(ν)', 'πίστεις']],
  ['πατήρ, masculine', 'gender-masculine', ['πατήρ', 'πατρός', 'πατρί', 'πατέρα'], ['πατέρες', 'πατέρων', 'πατράσι(ν)', 'πατέρας']],
  ['βασιλεύς, masculine', 'gender-masculine', ['βασιλεύς', 'βασιλέως', 'βασιλεῖ', 'βασιλέα'], ['βασιλεῖς', 'βασιλέων', 'βασιλεῦσι(ν)', 'βασιλεῖς']],
  ['γένος, neuter', 'gender-neuter', ['γένος', 'γένους', 'γένει', 'γένος'], ['γένη', 'γενῶν', 'γένεσι(ν)', 'γένη']],
];

export const THIRD_DECLENSION: Paradigm = {
  id: 'third-declension',
  name: 'The third declension',
  about: 'Six nouns whose stem changes: σάρξ, πνεῦμα, πίστις, πατήρ, βασιλεύς, γένος',
  ideas: ['declension-3'],
  tier: 'nouns',
  columns: [{ label: 'Singular' }, { label: 'Plural' }],
  rows: NOUNS.flatMap(([group, genderIdea, singular, plural]) =>
    CASES.map(([label, caseIdea], i) => ({
      group,
      label,
      cells: [
        { form: singular[i], lang: 'el' as const, ideas: ['noun', 'declension-3', caseIdea, genderIdea, 'number-singular'] },
        { form: plural[i], lang: 'el' as const, ideas: ['noun', 'declension-3', caseIdea, genderIdea, 'number-plural'] },
      ],
    })),
  ),
};
