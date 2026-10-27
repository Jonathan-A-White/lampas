// src/data/paradigms/hebrew/qalStrong.ts — the qal strong verb קָטַל “he killed” (mw-gdcyf98.13, PROVISIONAL, the Governor to confirm which forms the table holds): the perfect and the imperfect by person, gender and
// number (5 rows, singular and plural: 10 cells each) and the imperative (4 cells) = 24 forms. The third person plural of the perfect is common (קָטְלוּ for he and she alike), so its two cells hold the same form; the
// first person is common in the singular and the plural, so a first-person cell names no gender and opens before the gender idea does. Every cell names he-qal, its tense and he-person-gender-number.
import type { Paradigm, ParadigmCell } from '../types';

type Person = '1' | '2' | '3';
type Gender = 'm' | 'f' | 'c';
const TENSES = { perfect: 'he-perfect', imperfect: 'he-imperfect', imperative: 'he-imperative' } as const;

function cell(form: string, tense: keyof typeof TENSES, person: Person | undefined, gender: Gender, number: 's' | 'p'): ParadigmCell {
  return {
    form,
    lang: 'he',
    ideas: ['he-qal', TENSES[tense], 'he-person-gender-number', 'he-number', ...(gender === 'c' ? [] : ['he-gender'])],
    tags: [`tense:${tense}`, ...(person ? [`person:${person}`] : []), `gender:${gender}`, `number:${number}`],
  };
}

// [row label, person, gender, singular, plural]
const PERFECT: [string, Person, Gender, string, string][] = [
  ['3rd masculine', '3', 'm', 'קָטַל', 'קָטְלוּ'],
  ['3rd feminine', '3', 'f', 'קָטְלָה', 'קָטְלוּ'],
  ['2nd masculine', '2', 'm', 'קָטַלְתָּ', 'קְטַלְתֶּם'],
  ['2nd feminine', '2', 'f', 'קָטַלְתְּ', 'קְטַלְתֶּן'],
  ['1st common', '1', 'c', 'קָטַלְתִּי', 'קָטַלְנוּ'],
];

const IMPERFECT: [string, Person, Gender, string, string][] = [
  ['3rd masculine', '3', 'm', 'יִקְטֹל', 'יִקְטְלוּ'],
  ['3rd feminine', '3', 'f', 'תִּקְטֹל', 'תִּקְטֹלְנָה'],
  ['2nd masculine', '2', 'm', 'תִּקְטֹל', 'תִּקְטְלוּ'],
  ['2nd feminine', '2', 'f', 'תִּקְטְלִי', 'תִּקְטֹלְנָה'],
  ['1st common', '1', 'c', 'אֶקְטֹל', 'נִקְטֹל'],
];

// the imperative has no person (it is always the second): [row label, gender, singular, plural]
const IMPERATIVE: [string, Gender, string, string][] = [
  ['Masculine', 'm', 'קְטֹל', 'קִטְלוּ'],
  ['Feminine', 'f', 'קִטְלִי', 'קְטֹלְנָה'],
];

export const QAL_STRONG: Paradigm = {
  id: 'he-qal-strong',
  name: 'The qal verb',
  about: 'קָטַל “he killed”: the perfect, the imperfect and the imperative',
  ideas: ['he-qal', 'he-perfect', 'he-imperfect', 'he-imperative'],
  tier: 'verbs',
  columns: [{ label: 'Singular' }, { label: 'Plural' }],
  rows: [
    ...PERFECT.map(([label, person, gender, singular, plural]) => ({
      group: 'Perfect',
      label,
      cells: [cell(singular, 'perfect', person, gender, 's'), cell(plural, 'perfect', person, gender, 'p')],
    })),
    ...IMPERFECT.map(([label, person, gender, singular, plural]) => ({
      group: 'Imperfect',
      label,
      cells: [cell(singular, 'imperfect', person, gender, 's'), cell(plural, 'imperfect', person, gender, 'p')],
    })),
    ...IMPERATIVE.map(([label, gender, singular, plural]) => ({
      group: 'Imperative',
      label,
      cells: [cell(singular, 'imperative', undefined, gender, 's'), cell(plural, 'imperative', undefined, gender, 'p')],
    })),
  ],
};
