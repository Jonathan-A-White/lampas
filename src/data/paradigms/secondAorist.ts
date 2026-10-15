// src/data/paradigms/secondAorist.ts — βάλλω in the second aorist, active and middle, 6 persons each = 12 cells. PROVISIONAL (the
// Governor to confirm the name). The second aorist has no tense sign: the changed stem βαλ- (not βαλλ-) takes the endings of the
// imperfect, after the augment ἐ-. The hyphen stands where the stem ends; the accent moves onto the ending in ἐβαλ-όμην.
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [voice heading, voice idea, six forms in the order of PERSONS]
const COLUMNS: [string, string, string[]][] = [
  ['Active', 'voice-active', ['ἔβαλ-ον', 'ἔβαλ-ες', 'ἔβαλ-ε(ν)', 'ἐβάλ-ομεν', 'ἐβάλ-ετε', 'ἔβαλ-ον']],
  ['Middle', 'voice-middle', ['ἐβαλ-όμην', 'ἐβάλ-ου', 'ἐβάλ-ετο', 'ἐβαλ-όμεθα', 'ἐβάλ-εσθε', 'ἐβάλ-οντο']],
];

export const SECOND_AORIST: Paradigm = {
  id: 'second-aorist',
  name: 'Second aorist',
  about: 'βάλλω in the second aorist: a changed stem, the augment and the endings of the imperfect',
  ideas: ['second-tenses'],
  tier: 'verbs',
  columns: COLUMNS.map(([label]) => ({ group: 'Second aorist', label })),
  rows: PERSONS.map((person, i) => ({
    label: person[0],
    cells: COLUMNS.map(([, voiceIdea, forms]) => ({
      form: forms[i],
      lang: 'el' as const,
      ideas: verbIdeas(voiceIdea, person, 'tense-aorist', 'second-tenses', 'augment'),
    })),
  })),
};
