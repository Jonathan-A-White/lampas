// src/data/paradigms/persons.ts — what the verb tables of the indicative share: the six persons in order, and the ideas every verb cell
// names. Pure data.

// [label, person idea, number idea]
export const PERSONS = [
  ['1st person singular', 'person-1st', 'number-singular'],
  ['2nd person singular', 'person-2nd', 'number-singular'],
  ['3rd person singular', 'person-3rd', 'number-singular'],
  ['1st person plural', 'person-1st', 'number-plural'],
  ['2nd person plural', 'person-2nd', 'number-plural'],
  ['3rd person plural', 'person-3rd', 'number-plural'],
] as const;

/** The ideas of one cell of a verb in a finite mood: the verb, the mood, its voice, its person and number, then the ideas of the tense and of its signs. */
export const moodIdeas = (mood: string, voiceIdea: string, person: readonly [string, string, string], ...more: string[]): string[] => [
  'verb',
  mood,
  voiceIdea,
  person[1],
  person[2],
  ...more,
];

/** The ideas of one cell of a verb in the indicative: the same, with the indicative as the mood. */
export const verbIdeas = (voiceIdea: string, person: readonly [string, string, string], ...more: string[]): string[] =>
  moodIdeas('mood-indicative', voiceIdea, person, ...more);
