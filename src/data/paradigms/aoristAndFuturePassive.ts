// src/data/paradigms/aoristAndFuturePassive.ts — λύω in the aorist passive and the future passive, 6 persons each = 12 cells.
// PROVISIONAL (the Governor to confirm the name). The hyphen stands where the tense sign θη (aorist) or θησ (future) ends and the
// ending begins; the aorist passive takes the augment ἐ- and the active-looking secondary endings, the future passive the endings of
// the middle future. The 3rd person singular of the aorist is the bare ἐλύθη.
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [tense heading, tense idea, six forms in the order of PERSONS, ideas that belong to this tense only]
const COLUMNS: [string, string, string[], string[]][] = [
  ['Aorist', 'tense-aorist', ['ἐλύθη-ν', 'ἐλύθη-ς', 'ἐλύθη', 'ἐλύθη-μεν', 'ἐλύθη-τε', 'ἐλύθη-σαν'], ['augment']],
  ['Future', 'tense-future', ['λυθήσ-ομαι', 'λυθήσ-ῃ', 'λυθήσ-εται', 'λυθησ-όμεθα', 'λυθήσ-εσθε', 'λυθήσ-ονται'], []],
];

export const AORIST_AND_FUTURE_PASSIVE: Paradigm = {
  id: 'aorist-and-future-passive',
  name: 'Aorist and future passive',
  about: 'λύω in the aorist and the future passive: θη is the tense sign',
  ideas: ['voice-passive', 'tense-signs'],
  tier: 'verbs',
  columns: COLUMNS.map(([tense]) => ({ group: tense, label: 'Passive' })),
  rows: PERSONS.map((person, i) => ({
    label: person[0],
    cells: COLUMNS.map(([, tenseIdea, forms, extra]) => ({
      form: forms[i],
      lang: 'el' as const,
      ideas: verbIdeas('voice-passive', person, tenseIdea, 'tense-signs', ...extra),
    })),
  })),
};
