// src/data/paradigms/futureAndAorist.ts — λύω in the future and the first aorist, active and middle, 6 persons each = 24 cells.
// PROVISIONAL (the Governor to confirm the name and which tenses the table holds). The hyphen stands where the tense sign ends and the
// ending begins (λύσ-ω, ἔλυσ-α: σ is the sign), and the aorist starts with the augment ἐ-. The accent is written where it falls: it
// moves onto the ending in λυσ-όμεθα and ἐλυσ-άμην.
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [tense heading, voice heading, tense idea, voice idea, six forms in the order of PERSONS]
const COLUMNS: [string, string, string, string, string[]][] = [
  ['Future', 'Active', 'tense-future', 'voice-active', ['λύσ-ω', 'λύσ-εις', 'λύσ-ει', 'λύσ-ομεν', 'λύσ-ετε', 'λύσ-ουσι(ν)']],
  ['Future', 'Middle', 'tense-future', 'voice-middle', ['λύσ-ομαι', 'λύσ-ῃ', 'λύσ-εται', 'λυσ-όμεθα', 'λύσ-εσθε', 'λύσ-ονται']],
  ['Aorist', 'Active', 'tense-aorist', 'voice-active', ['ἔλυσ-α', 'ἔλυσ-ας', 'ἔλυσ-ε(ν)', 'ἐλύσ-αμεν', 'ἐλύσ-ατε', 'ἔλυσ-αν']],
  ['Aorist', 'Middle', 'tense-aorist', 'voice-middle', ['ἐλυσ-άμην', 'ἐλύσ-ω', 'ἐλύσ-ατο', 'ἐλυσ-άμεθα', 'ἐλύσ-ασθε', 'ἐλύσ-αντο']],
];

export const FUTURE_AND_AORIST: Paradigm = {
  id: 'future-and-aorist',
  name: 'Future and aorist',
  about: 'λύω in the future and the first aorist, active and middle: σ is the tense sign',
  ideas: ['tense-future', 'tense-aorist', 'tense-signs'],
  tier: 'verbs',
  columns: COLUMNS.map(([group, label]) => ({ group, label })),
  rows: PERSONS.map((person, i) => ({
    label: person[0],
    cells: COLUMNS.map(([, , tenseIdea, voiceIdea, forms]) => ({
      form: forms[i],
      lang: 'el' as const,
      // every cell has the tense sign σ; the aorist also has the augment
      ideas: verbIdeas(voiceIdea, person, tenseIdea, 'tense-signs', ...(tenseIdea === 'tense-aorist' ? ['augment'] : [])),
    })),
  })),
};
