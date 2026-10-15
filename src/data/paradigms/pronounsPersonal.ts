// src/data/paradigms/pronounsPersonal.ts — the personal pronouns: ἐγώ “I” and σύ “you” (4 cases x singular and plural, 8 each) and
// αὐτός “he, she, it” (4 cases x 3 genders x singular and plural, 24) = 40 forms (mw-svw421.2). PROVISIONAL (the Governor to confirm
// which pronouns the table holds). The forms of ἐγώ and σύ are the stressed ones (ἐμοῦ, ἐμοί, ἐμέ, σοῦ, σοί, σέ): the unstressed μου, μοι,
// με, σου, σοι, σε lean on the word before them and have no accent of their own.
import type { Paradigm } from './types';

const CASES = [
  ['Nominative', 'case-nominative'],
  ['Genitive', 'case-genitive'],
  ['Dative', 'case-dative'],
  ['Accusative', 'case-accusative'],
] as const;

// [group heading, the ideas every form of it names besides the case and the number, 4 singular forms, 4 plural forms] in the order of CASES.
const PRONOUNS: [string, string[], string[], string[]][] = [
  ['ἐγώ, I and we', ['person-1st'], ['ἐγώ', 'ἐμοῦ', 'ἐμοί', 'ἐμέ'], ['ἡμεῖς', 'ἡμῶν', 'ἡμῖν', 'ἡμᾶς']],
  ['σύ, you', ['person-2nd'], ['σύ', 'σοῦ', 'σοί', 'σέ'], ['ὑμεῖς', 'ὑμῶν', 'ὑμῖν', 'ὑμᾶς']],
  ['αὐτός, masculine', ['person-3rd', 'gender-masculine'], ['αὐτός', 'αὐτοῦ', 'αὐτῷ', 'αὐτόν'], ['αὐτοί', 'αὐτῶν', 'αὐτοῖς', 'αὐτούς']],
  ['αὐτός, feminine', ['person-3rd', 'gender-feminine'], ['αὐτή', 'αὐτῆς', 'αὐτῇ', 'αὐτήν'], ['αὐταί', 'αὐτῶν', 'αὐταῖς', 'αὐτάς']],
  ['αὐτός, neuter', ['person-3rd', 'gender-neuter'], ['αὐτό', 'αὐτοῦ', 'αὐτῷ', 'αὐτό'], ['αὐτά', 'αὐτῶν', 'αὐτοῖς', 'αὐτά']],
];

export const PRONOUNS_PERSONAL: Paradigm = {
  id: 'pronouns-personal',
  name: 'Personal pronouns',
  about: 'ἐγώ “I”, σύ “you” and αὐτός “he, she, it”',
  ideas: ['pronoun-personal'],
  tier: 'pronouns',
  columns: [{ label: 'Singular' }, { label: 'Plural' }],
  rows: PRONOUNS.flatMap(([group, own, singular, plural]) =>
    CASES.map(([label, caseIdea], i) => ({
      group,
      label,
      cells: [
        { form: singular[i], lang: 'el' as const, ideas: ['pronoun-personal', ...own, caseIdea, 'number-singular'] },
        { form: plural[i], lang: 'el' as const, ideas: ['pronoun-personal', ...own, caseIdea, 'number-plural'] },
      ],
    })),
  ),
};
