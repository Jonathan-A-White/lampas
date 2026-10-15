// src/data/paradigms/subjunctive.ts — λύω in the subjunctive: present active, present middle or passive, aorist active, aorist middle
// and aorist passive, 6 persons each = 30 cells. PROVISIONAL (the Governor to confirm the name and which tenses the table holds). The
// forms are written whole, a block of rows for each tense and voice (the persons down, singular and plural across, so each Greek form has
// the width of a phone's half). The aorist forms take the tense sign (σ, θ) and no augment: the subjunctive has none.
import { moodIdeas, PERSONS } from './persons';
import type { Paradigm } from './types';

// [tense heading, voice heading, tense idea, voice idea, six forms in the order of PERSONS, ideas of the tense's sign]
const COLUMNS: [string, string, string, string, string[], string[]][] = [
  ['Present', 'Active', 'tense-present', 'voice-active', ['λύω', 'λύῃς', 'λύῃ', 'λύωμεν', 'λύητε', 'λύωσι(ν)'], []],
  ['Present', 'Middle or passive', 'tense-present', 'voice-middle-or-passive', ['λύωμαι', 'λύῃ', 'λύηται', 'λυώμεθα', 'λύησθε', 'λύωνται'], []],
  ['Aorist', 'Active', 'tense-aorist', 'voice-active', ['λύσω', 'λύσῃς', 'λύσῃ', 'λύσωμεν', 'λύσητε', 'λύσωσι(ν)'], ['tense-signs']],
  ['Aorist', 'Middle', 'tense-aorist', 'voice-middle', ['λύσωμαι', 'λύσῃ', 'λύσηται', 'λυσώμεθα', 'λύσησθε', 'λύσωνται'], ['tense-signs']],
  ['Aorist', 'Passive', 'tense-aorist', 'voice-passive', ['λυθῶ', 'λυθῇς', 'λυθῇ', 'λυθῶμεν', 'λυθῆτε', 'λυθῶσι(ν)'], ['tense-signs']],
];

const PERSON_LABELS = ['1st person', '2nd person', '3rd person'];

// [number heading, index into PERSONS of that number's 1st person; its 2nd and 3rd follow]
const NUMBERS = [
  ['Singular', 0],
  ['Plural', 3],
] as const;

export const SUBJUNCTIVE: Paradigm = {
  id: 'subjunctive',
  name: 'The subjunctive',
  about: 'λύω in the subjunctive: present and aorist, active, middle and passive',
  ideas: ['mood-subjunctive'],
  tier: 'verbs',
  columns: NUMBERS.map(([label]) => ({ label })),
  rows: COLUMNS.flatMap(([tense, voice, tenseIdea, voiceIdea, forms, signs]) =>
    [0, 1, 2].map((p) => ({
      group: `${tense} ${voice.toLowerCase()}`,
      label: PERSON_LABELS[p],
      cells: NUMBERS.map(([, offset]) => ({
        form: forms[offset + p],
        lang: 'el' as const,
        ideas: moodIdeas('mood-subjunctive', voiceIdea, PERSONS[offset + p], tenseIdea, ...signs),
      })),
    })),
  ),
};
