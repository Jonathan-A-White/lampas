// src/data/paradigms/thirdDeclension.ts — the third declension: six nouns x 5 cases x singular and plural = 60 forms (mw-svw421.2; the vocative since mw-5r3p30.1003).
// PROVISIONAL (the Governor to confirm which nouns the table holds). The stem changes in the third declension (σάρξ, σαρκός), so each
// cell is the full form, not an ending.
import type { Paradigm } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
  ['Vocative', 'case-vocative'],
] as const;

// [group heading, gender idea, 5 singular forms, 5 plural forms] in the order of CASES.
const NOUNS: [string, string, string[], string[]][] = [
  ['σάρξ, feminine', 'gender-feminine', ['σάρξ', 'σαρκός', 'σαρκί', 'σάρκα', 'σάρξ'], ['σάρκες', 'σαρκῶν', 'σαρξί(ν)', 'σάρκας', 'σάρκες']],
  ['πνεῦμα, neuter', 'gender-neuter', ['πνεῦμα', 'πνεύματος', 'πνεύματι', 'πνεῦμα', 'πνεῦμα'], ['πνεύματα', 'πνευμάτων', 'πνεύμασι(ν)', 'πνεύματα', 'πνεύματα']],
  ['πίστις, feminine', 'gender-feminine', ['πίστις', 'πίστεως', 'πίστει', 'πίστιν', 'πίστι'], ['πίστεις', 'πίστεων', 'πίστεσι(ν)', 'πίστεις', 'πίστεις']],
  ['πατήρ, masculine', 'gender-masculine', ['πατήρ', 'πατρός', 'πατρί', 'πατέρα', 'πάτερ'], ['πατέρες', 'πατέρων', 'πατράσι(ν)', 'πατέρας', 'πατέρες']],
  ['βασιλεύς, masculine', 'gender-masculine', ['βασιλεύς', 'βασιλέως', 'βασιλεῖ', 'βασιλέα', 'βασιλεῦ'], ['βασιλεῖς', 'βασιλέων', 'βασιλεῦσι(ν)', 'βασιλεῖς', 'βασιλεῖς']],
  ['γένος, neuter', 'gender-neuter', ['γένος', 'γένους', 'γένει', 'γένος', 'γένος'], ['γένη', 'γενῶν', 'γένεσι(ν)', 'γένη', 'γένη']],
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
