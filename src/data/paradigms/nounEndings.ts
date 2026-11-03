// src/data/paradigms/nounEndings.ts — the endings of the first and second declension: five kinds of noun x 5 cases (the vocative since
// mw-5r3p30.1003) x singular and plural = 50 endings. PROVISIONAL (the Governor to confirm which declensions the table holds). An ending is written with its
// hyphen and no accent: where the accent falls depends on the noun.
import type { Paradigm } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
  ['Vocative', 'case-vocative'],
] as const;

// [group heading, gender idea, 5 singular endings, 5 plural endings] in the order of CASES.
const KINDS: [string, string, string[], string[]][] = [
  ['Second declension, masculine (λόγος)', 'gender-masculine', ['-ος', '-ου', '-ῳ', '-ον', '-ε'], ['-οι', '-ων', '-οις', '-ους', '-οι']],
  ['Second declension, neuter (τέκνον)', 'gender-neuter', ['-ον', '-ου', '-ῳ', '-ον', '-ον'], ['-α', '-ων', '-οις', '-α', '-α']],
  ['First declension, feminine in α (ἡμέρα)', 'gender-feminine', ['-α', '-ας', '-ᾳ', '-αν', '-α'], ['-αι', '-ων', '-αις', '-ας', '-αι']],
  ['First declension, feminine in η (φωνή)', 'gender-feminine', ['-η', '-ης', '-ῃ', '-ην', '-η'], ['-αι', '-ων', '-αις', '-ας', '-αι']],
  ['First declension, masculine (προφήτης)', 'gender-masculine', ['-ης', '-ου', '-ῃ', '-ην', '-α'], ['-αι', '-ων', '-αις', '-ας', '-αι']],
];

export const NOUN_ENDINGS: Paradigm = {
  id: 'noun-endings',
  name: 'Noun endings',
  about: 'The endings of the first and second declension',
  ideas: ['declension-1', 'declension-2'],
  tier: 'nouns',
  columns: [{ label: 'Singular' }, { label: 'Plural' }],
  rows: KINDS.flatMap(([group, genderIdea, singular, plural]) =>
    CASES.map(([label, caseIdea], i) => ({
      group,
      label,
      cells: [
        { form: singular[i], lang: 'el' as const, ideas: ['noun', caseIdea, genderIdea, 'number-singular'] },
        { form: plural[i], lang: 'el' as const, ideas: ['noun', caseIdea, genderIdea, 'number-plural'] },
      ],
    })),
  ),
};
