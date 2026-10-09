// src/data/paradigms/nounEndings.ts — the endings of the first and second declension: five kinds of noun x 4 cases x singular and
// plural = 40 endings. PROVISIONAL (the Governor to confirm which declensions the table holds). An ending is written with its
// hyphen and no accent: where the accent falls depends on the noun.
import type { Paradigm } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
] as const;

// [group heading, gender idea, 4 singular endings, 4 plural endings] in the order of CASES.
const KINDS: [string, string, string[], string[]][] = [
  ['Second declension, masculine (λόγος)', 'gender-masculine', ['-ος', '-ου', '-ῳ', '-ον'], ['-οι', '-ων', '-οις', '-ους']],
  ['Second declension, neuter (τέκνον)', 'gender-neuter', ['-ον', '-ου', '-ῳ', '-ον'], ['-α', '-ων', '-οις', '-α']],
  ['First declension, feminine in α (ἡμέρα)', 'gender-feminine', ['-α', '-ας', '-ᾳ', '-αν'], ['-αι', '-ων', '-αις', '-ας']],
  ['First declension, feminine in η (φωνή)', 'gender-feminine', ['-η', '-ης', '-ῃ', '-ην'], ['-αι', '-ων', '-αις', '-ας']],
  ['First declension, masculine (προφήτης)', 'gender-masculine', ['-ης', '-ου', '-ῃ', '-ην'], ['-αι', '-ων', '-αις', '-ας']],
];

export const NOUN_ENDINGS: Paradigm = {
  id: 'noun-endings',
  name: 'Noun endings',
  about: 'The endings of the first and second declension',
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
