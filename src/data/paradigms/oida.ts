// src/data/paradigms/oida.ts — οἶδα “I know” and its past ᾔδειν “I knew”, 6 persons each = 12 cells. PROVISIONAL (the Governor to
// confirm the name). οἶδα is a perfect in form and a present in sense; ᾔδειν is the pluperfect form that serves as its imperfect.
// The forms are written whole: the stem changes (οἰδ-, ἰδ-, εἰδ-).
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [verb with its meaning, tense idea of its form, six forms in the order of PERSONS]
const VERBS: [string, string, string[]][] = [
  ['οἶδα “I know”', 'tense-perfect', ['οἶδα', 'οἶδας', 'οἶδε(ν)', 'οἴδαμεν', 'οἴδατε', 'οἴδασι(ν)']],
  ['ᾔδειν “I knew”', 'tense-pluperfect', ['ᾔδειν', 'ᾔδεις', 'ᾔδει', 'ᾔδειμεν', 'ᾔδειτε', 'ᾔδεισαν']],
];

export const OIDA: Paradigm = {
  id: 'oida',
  name: 'οἶδα',
  about: 'The verb “to know”: οἶδα and ᾔδειν, a perfect and a pluperfect in form',
  ideas: ['oida'],
  tier: 'verbs',
  columns: [{ label: 'Greek' }],
  rows: VERBS.flatMap(([group, tenseIdea, forms]) =>
    PERSONS.map((person, i) => ({
      group,
      label: person[0],
      cells: [{ form: forms[i], lang: 'el' as const, ideas: verbIdeas('voice-active', person, tenseIdea, 'oida') }],
    })),
  ),
};
