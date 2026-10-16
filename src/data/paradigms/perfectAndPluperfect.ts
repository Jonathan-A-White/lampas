// src/data/paradigms/perfectAndPluperfect.ts — λύω in the perfect active, the perfect middle or passive and the pluperfect active,
// 6 persons each = 18 cells. PROVISIONAL (the Governor to confirm the name and which forms the table holds). Every form is reduplicated
// (λέ-λυ-: the first consonant repeated with ε); the active perfect and pluperfect have κ as their tense sign, the pluperfect also the
// augment (ἐ-λελύκ-ειν); the middle or passive perfect adds its endings straight to the stem (λέλυ-μαι). The hyphen stands where the
// stem, with its sign, ends. The pluperfect has ONE set of endings, -ειν -εις -ει -ειμεν -ειτε -εισαν, as οἶδα’s ᾔδειν has (oida.ts).
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [tense heading, voice heading, tense idea, voice idea, six forms in the order of PERSONS, ideas of this column only]
const COLUMNS: [string, string, string, string, string[], string[]][] = [
  ['Perfect', 'Active', 'tense-perfect', 'voice-active', ['λέλυκ-α', 'λέλυκ-ας', 'λέλυκ-ε(ν)', 'λελύκ-αμεν', 'λελύκ-ατε', 'λελύκ-ασι(ν)'], ['tense-signs']],
  ['Perfect', 'Middle or passive', 'tense-perfect', 'voice-middle-or-passive', ['λέλυ-μαι', 'λέλυ-σαι', 'λέλυ-ται', 'λελύ-μεθα', 'λέλυ-σθε', 'λέλυ-νται'], []],
  ['Pluperfect', 'Active', 'tense-pluperfect', 'voice-active', ['ἐλελύκ-ειν', 'ἐλελύκ-εις', 'ἐλελύκ-ει', 'ἐλελύκ-ειμεν', 'ἐλελύκ-ειτε', 'ἐλελύκ-εισαν'], ['augment', 'tense-signs']],
];

export const PERFECT_AND_PLUPERFECT: Paradigm = {
  id: 'perfect-and-pluperfect',
  name: 'Perfect and pluperfect',
  about: 'λύω in the perfect and the pluperfect: the reduplication λε- and the tense sign κ',
  ideas: ['tense-perfect', 'tense-pluperfect', 'reduplication'],
  tier: 'verbs',
  columns: COLUMNS.map(([group, label]) => ({ group, label })),
  rows: PERSONS.map((person, i) => ({
    label: person[0],
    cells: COLUMNS.map(([, , tenseIdea, voiceIdea, forms, extra]) => ({
      form: forms[i],
      lang: 'el' as const,
      ideas: verbIdeas(voiceIdea, person, tenseIdea, 'reduplication', ...extra),
    })),
  })),
};
