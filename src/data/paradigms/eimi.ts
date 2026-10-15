// src/data/paradigms/eimi.ts — εἰμί, “I am”: the present, imperfect and future indicative, 6 persons each, then the present subjunctive
// (6), imperative (4), infinitive (1) and participle (nominative and genitive singular of each gender, 6), each form with its English
// = 35 rows of 2 cells = 70 cells. PROVISIONAL (the Governor to confirm which moods the table holds). εἰμί has no voice, so no voice
// idea is named; every cell names `eimi` beside its mood.
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

// [mood idea, mood heading, tense heading, [label, ideas of the person, Greek, English] ...]: the moods other than the indicative, all in the present.
const MOODS: [string, string, [string, string[], string, string][]][] = [
  [
    'mood-subjunctive',
    'Subjunctive',
    [
      ['1st person singular', ['person-1st', 'number-singular'], 'ὦ', '(that) I may be'],
      ['2nd person singular', ['person-2nd', 'number-singular'], 'ᾖς', '(that) you may be'],
      ['3rd person singular', ['person-3rd', 'number-singular'], 'ᾖ', '(that) he, she, it may be'],
      ['1st person plural', ['person-1st', 'number-plural'], 'ὦμεν', '(that) we may be'],
      ['2nd person plural', ['person-2nd', 'number-plural'], 'ἦτε', '(that) you (plural) may be'],
      ['3rd person plural', ['person-3rd', 'number-plural'], 'ὦσι(ν)', '(that) they may be'],
    ],
  ],
  [
    'mood-imperative',
    'Imperative',
    [
      ['2nd person singular', ['person-2nd', 'number-singular'], 'ἴσθι', 'be!'],
      ['3rd person singular', ['person-3rd', 'number-singular'], 'ἔστω', 'let him, her, it be'],
      ['2nd person plural', ['person-2nd', 'number-plural'], 'ἔστε', 'be! (plural)'],
      ['3rd person plural', ['person-3rd', 'number-plural'], 'ἔστωσαν', 'let them be'],
    ],
  ],
  ['mood-infinitive', 'Infinitive', [['Present', [], 'εἶναι', 'to be']]],
  [
    'mood-participle',
    'Participle',
    [
      ['Masculine Nominative Singular', ['case-nominative', 'number-singular', 'gender-masculine'], 'ὤν', 'being'],
      ['Masculine Genitive Singular', ['case-genitive', 'number-singular', 'gender-masculine'], 'ὄντος', 'of one being'],
      ['Feminine Nominative Singular', ['case-nominative', 'number-singular', 'gender-feminine'], 'οὖσα', 'being'],
      ['Feminine Genitive Singular', ['case-genitive', 'number-singular', 'gender-feminine'], 'οὔσης', 'of one being'],
      ['Neuter Nominative Singular', ['case-nominative', 'number-singular', 'gender-neuter'], 'ὄν', 'being'],
      ['Neuter Genitive Singular', ['case-genitive', 'number-singular', 'gender-neuter'], 'ὄντος', 'of one being'],
    ],
  ],
];

export const EIMI: Paradigm = {
  id: 'eimi',
  name: 'εἰμί',
  about: 'The verb “to be”: the indicative, then the subjunctive, imperative, infinitive and participle',
  ideas: ['eimi'],
  tier: 'verbs',
  columns: [{ label: 'Greek' }, { label: 'English' }],
  rows: [
    ...TENSES.flatMap(([group, tenseIdea, greek, english]) =>
      PERSONS.map(([label, personIdea, numberIdea], i) => {
        const ideas = ['eimi', 'verb', tenseIdea, 'mood-indicative', personIdea, numberIdea];
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
    ...MOODS.flatMap(([moodIdea, group, forms]) =>
      forms.map(([label, more, greek, english]) => {
        const ideas = ['eimi', 'verb', 'tense-present', moodIdea, ...more];
        return {
          group,
          label,
          cells: [
            { form: greek, lang: 'el' as const, ideas },
            { form: english, lang: 'en' as const, ideas },
          ],
        };
      }),
    ),
  ],
};
