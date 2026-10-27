// src/data/grammar/hebrew/teach/joiners.ts — the cards of the Hebrew joiners tier (mw-gdcyf98.12): the conjunctions and the small words, and asking a question. Worked words are of Genesis 1 and Jonah 1.
import type { Teach } from '../../teach/types';

export const JOINERS_TEACH: Readonly<Record<string, Teach>> = {
  'he-conjunctions': {
    whatItIs: 'A conjunction joins clauses: ‘because’, ‘that’, ‘but’. Besides ו ‘and’, Hebrew has small words of its own, such as כִּי. This card also holds the other small words of the parsing: the adverb, the interjection and the negative particle.',
    howToSpot: 'Look for a short word at the start of a clause. כִּי gives a reason or opens what follows; הִנֵּה points at something; אַל־ and לֹא come right before the verb they deny.',
    worked: [
      { word: 'כִּי', ref: 'Jonah 1:10', gloss: 'because', steps: ['It stands at the start of a clause and gives its reason.', 'It is a conjunction: ‘because’.'] },
      { word: 'הִנֵּה', ref: 'Genesis 1:29', gloss: 'behold', steps: ['It stands at the start of a clause and points at what follows.', 'The table calls it an interjection: ‘behold’.'] },
      { word: 'אַל', ref: 'Jonah 1:14', gloss: 'do not', steps: ['It stands right before the verb it denies.', 'The table calls it an adverb. It denies a wish: ‘do not’.'] },
    ],
  },
  'he-interrogative': {
    whatItIs: 'A question word asks: ‘who?’, ‘what?’, ‘where?’. Hebrew has מִי ‘who’, מָה ‘what’ and אַיִן ‘where’, alone or after a preposition. A yes-or-no question may have no question word at all.',
    howToSpot: 'Look for מִי or מָה at the start of a clause. A preposition can be written on the front of it: לְמִי ‘to whom’, וּמֵאַיִן ‘and from where’.',
    worked: [
      { word: 'מָה', ref: 'Jonah 1:8', gloss: 'what', steps: ['It stands at the start of its clause.', 'It asks about a thing: ‘what?’.'] },
      { word: 'לְמִי', ref: 'Jonah 1:8', gloss: 'to whom', steps: ['The first letter, ל lamed, is the prefix ‘to’.', 'What is left is מִי ‘who’, so the word asks ‘to whom?’.'] },
      { word: 'וּמֵאַיִן', ref: 'Jonah 1:8', gloss: 'and from where', steps: ['The first letter is ו vav with a dot inside it: ‘and’. Then מ mem with a tsere is ‘from’.', 'What is left is אַיִן ‘where’, so the word asks ‘and from where?’.'] },
    ],
  },
};
