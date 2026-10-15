// src/data/paradigms/miVerbs.ts — δίδωμι, τίθημι and ἵστημι in the present active and the aorist active, 6 persons each = 36 cells.
// PROVISIONAL (the Governor to confirm the name and the verbs). The stem's vowel lengthens and the endings are added without the
// linking vowel, so every form is written whole. The aorists of δίδωμι and τίθημι take κ as their tense sign (ἔδωκα, ἔθηκα); the aorist
// of ἵστημι is a second aorist (ἔστην, no sign, the stem changed).
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [verb with its meaning, six present forms, six aorist forms, ideas of the aorist only]
const VERBS: [string, string[], string[], string[]][] = [
  [
    'δίδωμι “I give”',
    ['δίδωμι', 'δίδως', 'δίδωσι(ν)', 'δίδομεν', 'δίδοτε', 'διδόασι(ν)'],
    ['ἔδωκα', 'ἔδωκας', 'ἔδωκε(ν)', 'ἐδώκαμεν', 'ἐδώκατε', 'ἔδωκαν'],
    ['tense-signs'],
  ],
  [
    'τίθημι “I put”',
    ['τίθημι', 'τίθης', 'τίθησι(ν)', 'τίθεμεν', 'τίθετε', 'τιθέασι(ν)'],
    ['ἔθηκα', 'ἔθηκας', 'ἔθηκε(ν)', 'ἐθήκαμεν', 'ἐθήκατε', 'ἔθηκαν'],
    ['tense-signs'],
  ],
  [
    'ἵστημι “I set up”',
    ['ἵστημι', 'ἵστης', 'ἵστησι(ν)', 'ἵσταμεν', 'ἵστατε', 'ἱστᾶσι(ν)'],
    ['ἔστην', 'ἔστης', 'ἔστη', 'ἔστημεν', 'ἔστητε', 'ἔστησαν'],
    ['second-tenses'],
  ],
];

export const MI_VERBS: Paradigm = {
  id: 'mi-verbs',
  name: 'Verbs in -μι',
  about: 'δίδωμι, τίθημι and ἵστημι in the present and the aorist, active',
  ideas: ['mi-verbs'],
  tier: 'verbs',
  columns: [
    { group: 'Present', label: 'Active' },
    { group: 'Aorist', label: 'Active' },
  ],
  rows: VERBS.flatMap(([group, present, aorist, aoristIdeas]) =>
    PERSONS.map((person, i) => ({
      group,
      label: person[0],
      cells: [
        { form: present[i], lang: 'el' as const, ideas: verbIdeas('voice-active', person, 'tense-present', 'mi-verbs') },
        { form: aorist[i], lang: 'el' as const, ideas: verbIdeas('voice-active', person, 'tense-aorist', 'mi-verbs', 'augment', ...aoristIdeas) },
      ],
    })),
  ),
};
