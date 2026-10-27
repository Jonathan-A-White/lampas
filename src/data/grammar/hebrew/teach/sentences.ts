// src/data/grammar/hebrew/teach/sentences.ts — the cards of the Hebrew sentences tier (mw-gdcyf98.12): the verbless clause and word order. Worked words are of Genesis 1 and Jonah 1.
import type { Teach } from '../../teach/types';

export const SENTENCES_TEACH: Readonly<Record<string, Teach>> = {
  'he-verbless-clause': {
    whatItIs: 'A Hebrew sentence need not have a verb for ‘is’. Two words side by side, a subject and what is told of it, are enough. English adds ‘is’ or ‘am’: עִבְרִי אָנֹכִי, ‘a Hebrew am I’.',
    howToSpot: 'Look for a clause with no verb. A noun or a pronoun comes with a noun, an adjective or a phrase, and the meaning of ‘is’ comes from putting them together.',
    worked: [
      { word: 'עִבְרִי', ref: 'Jonah 1:9', gloss: 'a Hebrew', steps: ['The clause is עִבְרִי אָנֹכִי, two words and no verb.', 'The noun עִבְרִי ‘Hebrew’ is told of the pronoun אָנֹכִי ‘I’: ‘a Hebrew am I’.'] },
      { word: 'טוֹב', ref: 'Genesis 1:4', gloss: 'good', steps: ['After כִּי ‘that’ comes טוֹב and nothing else: no verb.', 'English adds ‘was’: ‘that the light was good’.'] },
      { word: 'אַרְצֶךָ', ref: 'Jonah 1:8', gloss: 'your country', steps: ['The clause is מָה אַרְצֶךָ: a question word and a noun, with no verb.', 'English adds ‘is’: ‘What is your country?’.'] },
    ],
  },
  'he-word-order': {
    whatItIs: 'The verb usually comes first in a Hebrew clause, then the subject, then the object: ‘created God the heavens’. English puts the subject first. A noun placed before the verb is being set apart.',
    howToSpot: 'Look for the verb at the front of its clause, or right after an opening phrase. A story clause starts with וַ and a verb. A noun before the verb gives background or a new scene.',
    table: {
      caption: 'Genesis 1:1 in the order of each language',
      columns: ['Hebrew', 'English'],
      rows: [{ label: 'order', cells: ['verb, subject, object', 'subject, verb, object'] }],
    },
    worked: [
      { word: 'בָּרָא', ref: 'Genesis 1:1', gloss: 'he created', steps: ['The verb comes first, right after the opening phrase בְּרֵאשִׁית ‘in the beginning’.', 'The subject אֱלֹהִים ‘God’ follows it, and then the object: verb, subject, object.'] },
      { word: 'וְהָאָרֶץ', ref: 'Genesis 1:2', gloss: 'and the earth', steps: ['This noun comes before its verb, הָיְתָה ‘was’.', 'That sets the earth apart as a new scene, a background note and not the next step of the story.'] },
    ],
  },
};
