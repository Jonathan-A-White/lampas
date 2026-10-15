// src/data/paradigms/pronounsInterrogativeIndefinite.ts — the interrogative τίς “who? what?” and the indefinite τις “someone, a certain”:
// 4 cases x singular and plural x masculine-feminine and neuter, 16 each = 32 forms (mw-svw421.2). PROVISIONAL (the Governor to confirm
// the table). The forms are alike but for the accent: τίς always carries an acute on its first syllable, while τις is an enclitic with
// none (and where it does carry one, it is on the last syllable: τινός, τινί).
import type { Paradigm, ParadigmCell } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
] as const;

// [number, number idea, gender heading, gender ideas]; the order of the four columns. The masculine and the feminine share their forms.
const COLUMNS: [string, string, string, string[]][] = [
  ['Singular', 'number-singular', 'Masc. or fem.', ['gender-masculine', 'gender-feminine']],
  ['Singular', 'number-singular', 'Neuter', ['gender-neuter']],
  ['Plural', 'number-plural', 'Masc. or fem.', ['gender-masculine', 'gender-feminine']],
  ['Plural', 'number-plural', 'Neuter', ['gender-neuter']],
];

// [group heading, the pronoun's idea, four rows of four forms in column order]
const PRONOUNS: [string, string, string[][]][] = [
  [
    'τίς, who? what?',
    'pronoun-interrogative',
    [
      ['τίς', 'τί', 'τίνες', 'τίνα'],
      ['τίνος', 'τίνος', 'τίνων', 'τίνων'],
      ['τίνι', 'τίνι', 'τίσι(ν)', 'τίσι(ν)'],
      ['τίνα', 'τί', 'τίνας', 'τίνα'],
    ],
  ],
  [
    'τις, someone or a certain',
    'pronoun-indefinite',
    [
      ['τις', 'τι', 'τινές', 'τινά'],
      ['τινός', 'τινός', 'τινῶν', 'τινῶν'],
      ['τινί', 'τινί', 'τισί(ν)', 'τισί(ν)'],
      ['τινά', 'τι', 'τινάς', 'τινά'],
    ],
  ],
];

export const PRONOUNS_INTERROGATIVE_INDEFINITE: Paradigm = {
  id: 'pronouns-interrogative-indefinite',
  name: 'Interrogative and indefinite pronouns',
  about: 'τίς “who?” and τις “someone”: the accent tells them apart',
  ideas: ['pronoun-interrogative', 'pronoun-indefinite'],
  tier: 'pronouns',
  columns: COLUMNS.map(([group, , label]) => ({ group, label, short: label === 'Masc. or fem.' ? 'M. / F.' : 'Neut.' })),
  rows: PRONOUNS.flatMap(([group, pronounIdea, forms]) =>
    CASES.map(([label, caseIdea], r) => ({
      group,
      label,
      cells: COLUMNS.map(([, numberIdea, , genderIdeas], c): ParadigmCell => ({
        form: forms[r][c],
        lang: 'el',
        ideas: [pronounIdea, caseIdea, ...genderIdeas, numberIdea],
      })),
    })),
  ),
};
