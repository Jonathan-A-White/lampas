// src/data/paradigms/contractVerbs.ts — the present active of three contract verbs, ἀγαπάω, ποιέω and πληρόω, 6 persons each = 18
// cells. PROVISIONAL (the Governor to confirm the name and the verbs). The stem's vowel (α, ε, ο) runs together with the vowel of the
// ending, so the whole form is written, not an ending: ἀγαπάω gives ἀγαπῶ, ἀγαπᾷ; ποιέω gives ποιεῖ, ποιοῦμεν; πληρόω gives πληροῖ.
import { PERSONS, verbIdeas } from './persons';
import type { Paradigm } from './types';

// [verb with its meaning, six forms in the order of PERSONS]
const VERBS: [string, string[]][] = [
  ['ἀγαπάω “I love”', ['ἀγαπῶ', 'ἀγαπᾷς', 'ἀγαπᾷ', 'ἀγαπῶμεν', 'ἀγαπᾶτε', 'ἀγαπῶσι(ν)']],
  ['ποιέω “I do”', ['ποιῶ', 'ποιεῖς', 'ποιεῖ', 'ποιοῦμεν', 'ποιεῖτε', 'ποιοῦσι(ν)']],
  ['πληρόω “I fill”', ['πληρῶ', 'πληροῖς', 'πληροῖ', 'πληροῦμεν', 'πληροῦτε', 'πληροῦσι(ν)']],
];

export const CONTRACT_VERBS: Paradigm = {
  id: 'contract-verbs',
  name: 'Contract verbs',
  about: 'ἀγαπάω, ποιέω and πληρόω in the present: the stem’s vowel runs into the ending',
  ideas: ['contract-verbs'],
  tier: 'verbs',
  columns: [{ group: 'Present', label: 'Active' }],
  rows: VERBS.flatMap(([group, forms]) =>
    PERSONS.map((person, i) => ({
      group,
      label: person[0],
      cells: [{ form: forms[i], lang: 'el' as const, ideas: verbIdeas('voice-active', person, 'tense-present', 'contract-verbs') }],
    })),
  ),
};
