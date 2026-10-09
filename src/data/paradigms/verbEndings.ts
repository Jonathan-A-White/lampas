// src/data/paradigms/verbEndings.ts — the endings of a regular verb (λύω) in the indicative: present and imperfect, active and middle
// or passive, 6 persons each = 24 endings. PROVISIONAL (the Governor to confirm which tenses the table holds). An ending is written
// with its hyphen and no accent; the imperfect also takes an augment in front of the stem (ἔ-), which is not shown here.
import type { Paradigm } from './types';

// [tense heading, voice heading, tense idea, voice idea, six endings in the order of PERSONS]
const COLUMNS: [string, string, string, string, string[]][] = [
  ['Present', 'Active', 'tense-present', 'voice-active', ['-ω', '-εις', '-ει', '-ομεν', '-ετε', '-ουσι(ν)']],
  ['Present', 'Middle or passive', 'tense-present', 'voice-middle-or-passive', ['-ομαι', '-ῃ', '-εται', '-ομεθα', '-εσθε', '-ονται']],
  ['Imperfect', 'Active', 'tense-imperfect', 'voice-active', ['-ον', '-ες', '-ε(ν)', '-ομεν', '-ετε', '-ον']],
  ['Imperfect', 'Middle or passive', 'tense-imperfect', 'voice-middle-or-passive', ['-ομην', '-ου', '-ετο', '-ομεθα', '-εσθε', '-οντο']],
];

// [label, person idea, number idea]
const PERSONS = [
  ['1st singular', 'person-1st', 'number-singular'],
  ['2nd singular', 'person-2nd', 'number-singular'],
  ['3rd singular', 'person-3rd', 'number-singular'],
  ['1st plural', 'person-1st', 'number-plural'],
  ['2nd plural', 'person-2nd', 'number-plural'],
  ['3rd plural', 'person-3rd', 'number-plural'],
] as const;

export const VERB_ENDINGS: Paradigm = {
  id: 'verb-endings',
  name: 'Verb endings',
  about: 'Present and imperfect endings, active and middle or passive',
  columns: COLUMNS.map(([group, label]) => ({ group, label })),
  rows: PERSONS.map(([label, personIdea, numberIdea], i) => ({
    label,
    cells: COLUMNS.map(([, , tenseIdea, voiceIdea, endings]) => ({
      form: endings[i],
      lang: 'el' as const,
      ideas: ['verb', tenseIdea, voiceIdea, 'mood-indicative', personIdea, numberIdea],
    })),
  })),
};
