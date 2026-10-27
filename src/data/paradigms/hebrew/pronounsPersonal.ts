// src/data/paradigms/hebrew/pronounsPersonal.ts — the independent personal pronouns (mw-gdcyf98.13, PROVISIONAL): 5 persons (1st common, 2nd and 3rd masculine and feminine) x singular and plural = 10 forms.
// The first person is common, so its cells name no gender; אֲנִי has the longer אָנֹכִי beside it in the text. A cell names he-pronoun-personal.
import type { Paradigm, ParadigmCell } from '../types';

type Gender = 'm' | 'f' | 'c';

function cell(form: string, person: '1' | '2' | '3', gender: Gender, number: 's' | 'p'): ParadigmCell {
  return {
    form,
    lang: 'he',
    ideas: ['he-pronoun-personal', 'he-number', ...(gender === 'c' ? [] : ['he-gender'])],
    tags: [`person:${person}`, `gender:${gender}`, `number:${number}`],
  };
}

// [row label, person, gender, singular, plural]
const PRONOUNS: [string, '1' | '2' | '3', Gender, string, string][] = [
  ['1st common', '1', 'c', 'אֲנִי', 'אֲנַחְנוּ'],
  ['2nd masculine', '2', 'm', 'אַתָּה', 'אַתֶּם'],
  ['2nd feminine', '2', 'f', 'אַתְּ', 'אַתֶּן'],
  ['3rd masculine', '3', 'm', 'הוּא', 'הֵם'],
  ['3rd feminine', '3', 'f', 'הִיא', 'הֵן'],
];

export const PRONOUNS_PERSONAL_HEBREW: Paradigm = {
  id: 'he-pronouns-personal',
  name: 'Hebrew personal pronouns',
  about: 'אֲנִי “I”, אַתָּה “you”, הוּא “he” and the rest',
  ideas: ['he-pronoun-personal'],
  tier: 'pronouns',
  columns: [{ label: 'Singular' }, { label: 'Plural' }],
  rows: PRONOUNS.map(([label, person, gender, singular, plural]) => ({ label, cells: [cell(singular, person, gender, 's'), cell(plural, person, gender, 'p')] })),
};
