// src/data/paradigms/eimi.ts — εἰμί, “I am”: the present, imperfect and future indicative, 6 persons each, each form with its English
// = 36 cells. PROVISIONAL (the Governor to confirm which tenses the table holds). εἰμί has no voice, so no voice idea is named.
import type { Paradigm } from './types';

// [tense, tense idea, six Greek forms, six English forms] in the order of PERSONS.
const TENSES: [string, string, string[], string[]][] = [
  ['Present', 'tense-present', ['εἰμί', 'εἶ', 'ἐστί(ν)', 'ἐσμέν', 'ἐστέ', 'εἰσί(ν)'], ['I am', 'you are', 'he, she, it is', 'we are', 'you (plural) are', 'they are']],
  ['Imperfect', 'tense-imperfect', ['ἤμην', 'ἦς', 'ἦν', 'ἦμεν', 'ἦτε', 'ἦσαν'], ['I was', 'you were', 'he, she, it was', 'we were', 'you (plural) were', 'they were']],
  ['Future', 'tense-future', ['ἔσομαι', 'ἔσῃ', 'ἔσται', 'ἐσόμεθα', 'ἔσεσθε', 'ἔσονται'], ['I will be', 'you will be', 'he, she, it will be', 'we will be', 'you (plural) will be', 'they will be']],
];

// [label, person idea, number idea]
const PERSONS = [
  ['1st person singular', 'person-1st', 'number-singular'],
  ['2nd person singular', 'person-2nd', 'number-singular'],
  ['3rd person singular', 'person-3rd', 'number-singular'],
  ['1st person plural', 'person-1st', 'number-plural'],
  ['2nd person plural', 'person-2nd', 'number-plural'],
  ['3rd person plural', 'person-3rd', 'number-plural'],
] as const;

export const EIMI: Paradigm = {
  id: 'eimi',
  name: 'εἰμί',
  about: 'The verb “to be”: present, imperfect and future',
  columns: [{ label: 'Greek' }, { label: 'English' }],
  rows: TENSES.flatMap(([group, tenseIdea, greek, english]) =>
    PERSONS.map(([label, personIdea, numberIdea], i) => {
      const ideas = ['verb', tenseIdea, 'mood-indicative', personIdea, numberIdea];
      return {
        group,
        label,
        cells: [
          { form: greek[i], lang: 'el' as const, ideas },
          { form: english[i], lang: 'en' as const, ideas },
        ],
      };
    }),
  ),
};
