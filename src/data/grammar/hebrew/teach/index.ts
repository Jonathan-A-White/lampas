// src/data/grammar/hebrew/teach/index.ts — the Hebrew cards' teaching, by Hebrew ladder idea id (mw-gdcyf98.9): the same Teach shape as the Greek cards
// (src/data/grammar/teach), written so a total beginner learns the idea from the card alone. One idea to start, the alphabet; stories g and h add the rest.
import { HEBREW_LADDER } from '../ladder';
import type { Teach } from '../../teach/types';

export const HEBREW_TEACH: Readonly<Record<string, Teach>> = {
  'he-alphabet': {
    whatItIs:
      'Hebrew has 22 letters, and all of them are consonants: the vowels are small marks added to them, which you meet later. Hebrew is written and read from right to left, the other way round from English. Each letter has a name, such as aleph and bet, and five letters have a second shape for the end of a word.',
    howToSpot:
      'Start at the right-hand end of a word and read toward the left. Look at the shape of each letter and say its name: א is aleph, ב is bet, ל is lamed. At the end of a word five letters change shape: ם is מ (mem), ן is נ (nun), ך is כ (kaf), ף is פ (pe) and ץ is צ (tsade).',
    worked: [
      {
        word: 'אב',
        gloss: 'father',
        steps: ['Start at the right: א is aleph.', 'Then the letter to its left: ב is bet.', 'Together אב is “ab”, the word for “father”.'],
      },
      {
        word: 'שלום',
        gloss: 'peace',
        steps: ['Start at the right: ש is shin.', 'Then ל is lamed, and ו is vav.', 'The last letter, on the far left, is ם: mem in its end-of-word shape.', 'Together שלום is “shalom”, the word for “peace”.'],
      },
    ],
  },
};

for (const id of Object.keys(HEBREW_TEACH)) if (!HEBREW_LADDER.some((i) => i.id === id)) throw new Error(`Teaching for ${JSON.stringify(id)}, which the Hebrew ladder has not`);
