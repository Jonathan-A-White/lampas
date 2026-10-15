// src/data/paradigms/imperative.ts — λύω in the imperative: present active, present middle or passive, aorist active, aorist middle
// and aorist passive; the 2nd and 3rd person, singular and plural (there is no 1st person) = 20 cells. PROVISIONAL (the Governor to
// confirm the name). The forms are written whole, a block of rows for each tense and voice (2nd and 3rd person down, singular and plural across). The aorist forms take the tense sign (σ, θ) and no augment.
import { moodIdeas, PERSONS } from './persons';
import type { Paradigm } from './types';

// The persons the imperative has, in the order of its forms: 2nd singular, 3rd singular, 2nd plural, 3rd plural.
const IMPERATIVE_PERSONS = [1, 2, 4, 5].map((i) => PERSONS[i]);

// [tense heading, voice heading, tense idea, voice idea, four forms in the order of IMPERATIVE_PERSONS, ideas of the tense's sign]
const COLUMNS: [string, string, string, string, string[], string[]][] = [
  ['Present', 'Active', 'tense-present', 'voice-active', ['λῦε', 'λυέτω', 'λύετε', 'λυέτωσαν'], []],
  ['Present', 'Middle or passive', 'tense-present', 'voice-middle-or-passive', ['λύου', 'λυέσθω', 'λύεσθε', 'λυέσθωσαν'], []],
  ['Aorist', 'Active', 'tense-aorist', 'voice-active', ['λῦσον', 'λυσάτω', 'λύσατε', 'λυσάτωσαν'], ['tense-signs']],
  ['Aorist', 'Middle', 'tense-aorist', 'voice-middle', ['λῦσαι', 'λυσάσθω', 'λύσασθε', 'λυσάσθωσαν'], ['tense-signs']],
  ['Aorist', 'Passive', 'tense-aorist', 'voice-passive', ['λύθητι', 'λυθήτω', 'λύθητε', 'λυθήτωσαν'], ['tense-signs']],
];

const PERSON_LABELS = ['2nd person', '3rd person'];

export const IMPERATIVE: Paradigm = {
  id: 'imperative',
  name: 'The imperative',
  about: 'λύω in the imperative: the commands, present and aorist',
  ideas: ['mood-imperative'],
  tier: 'verbs',
  columns: [{ label: 'Singular' }, { label: 'Plural' }],
  rows: COLUMNS.flatMap(([tense, voice, tenseIdea, voiceIdea, forms, signs]) =>
    [0, 1].map((p) => ({
      group: `${tense} ${voice.toLowerCase()}`,
      label: PERSON_LABELS[p],
      cells: [0, 2].map((offset) => ({
        form: forms[offset + p],
        lang: 'el' as const,
        ideas: moodIdeas('mood-imperative', voiceIdea, IMPERATIVE_PERSONS[offset + p], tenseIdea, ...signs),
      })),
    })),
  ),
};
