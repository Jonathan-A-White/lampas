// src/data/paradigms/hebrew/nounSuffixes.ts — the pronominal suffixes on a noun (mw-gdcyf98.13, PROVISIONAL): סוּס “horse” with “my, your, his …” written on its end, on a singular noun (סוּסִי “my horse”) and on a plural
// noun (סוּסַי “my horses”): 10 suffixes x 2 = 20 forms. The suffix is a pronoun written on the word, so a cell names he-suffix-pronominal; a first-person cell names no gender.
import type { Paradigm, ParadigmCell } from '../types';

type Gender = 'm' | 'f' | 'c';

function cell(form: string, person: '1' | '2' | '3', gender: Gender, number: 's' | 'p', noun: 's' | 'p'): ParadigmCell {
  return {
    form,
    lang: 'he',
    ideas: ['he-suffix-pronominal', 'he-number', ...(gender === 'c' ? [] : ['he-gender'])],
    tags: [`person:${person}`, `gender:${gender}`, `number:${number}`, `noun:${noun}`],
  };
}

// [row label, person, gender, on a singular noun, on a plural noun]
const ONE_OWNER: [string, '1' | '2' | '3', Gender, string, string][] = [
  ['1st common', '1', 'c', 'סוּסִי', 'סוּסַי'],
  ['2nd masculine', '2', 'm', 'סוּסְךָ', 'סוּסֶיךָ'],
  ['2nd feminine', '2', 'f', 'סוּסֵךְ', 'סוּסַיִךְ'],
  ['3rd masculine', '3', 'm', 'סוּסוֹ', 'סוּסָיו'],
  ['3rd feminine', '3', 'f', 'סוּסָהּ', 'סוּסֶיהָ'],
];

const SEVERAL_OWNERS: [string, '1' | '2' | '3', Gender, string, string][] = [
  ['1st common', '1', 'c', 'סוּסֵנוּ', 'סוּסֵינוּ'],
  ['2nd masculine', '2', 'm', 'סוּסְכֶם', 'סוּסֵיכֶם'],
  ['2nd feminine', '2', 'f', 'סוּסְכֶן', 'סוּסֵיכֶן'],
  ['3rd masculine', '3', 'm', 'סוּסָם', 'סוּסֵיהֶם'],
  ['3rd feminine', '3', 'f', 'סוּסָן', 'סוּסֵיהֶן'],
];

export const NOUN_SUFFIXES: Paradigm = {
  id: 'he-noun-suffixes',
  name: 'Pronominal suffixes',
  about: 'סוּס “horse” with “my”, “your”, “his” … on its end',
  ideas: ['he-suffix-pronominal'],
  tier: 'nouns',
  columns: [
    { label: 'Singular noun', short: 'On one' },
    { label: 'Plural noun', short: 'On many' },
  ],
  rows: [
    ...ONE_OWNER.map(([label, person, gender, one, many]) => ({
      group: 'One owner',
      label,
      cells: [cell(one, person, gender, 's', 's'), cell(many, person, gender, 's', 'p')],
    })),
    ...SEVERAL_OWNERS.map(([label, person, gender, one, many]) => ({
      group: 'Several owners',
      label,
      cells: [cell(one, person, gender, 'p', 's'), cell(many, person, gender, 'p', 'p')],
    })),
  ],
};
