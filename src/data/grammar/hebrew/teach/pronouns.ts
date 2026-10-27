// src/data/grammar/hebrew/teach/pronouns.ts — the cards of the Hebrew pronouns tier (mw-gdcyf98.12): the personal pronouns, this and that, and the relative אֲשֶׁר. Worked words are of Genesis 1 and Jonah 1.
import type { Teach } from '../../teach/types';

export const PRONOUNS_TEACH: Readonly<Record<string, Teach>> = {
  'he-pronoun-personal': {
    whatItIs: 'A personal pronoun takes the place of a person: I, you, he, she, we, they. Hebrew has three persons: first (I, we), second (you) and third (he, she, they). A pronoun has gender and number, as a noun does.',
    howToSpot: 'Look for a short word standing alone: אֲנִי ‘I’, אַתָּה ‘you’, הוּא ‘he’. A verb already shows its person in its ending, so these words are used when the person matters.',
    table: {
      caption: 'The personal pronouns',
      columns: ['one', 'many'],
      rows: [
        { label: 'first person (I, we)', cells: ['אֲנִי', 'אֲנַחְנוּ'] },
        { label: 'second person, masculine (you)', cells: ['אַתָּה', 'אַתֶּם'] },
        { label: 'second person, feminine (you)', cells: ['אַתְּ', 'אַתֵּנָּה'] },
        { label: 'third person, masculine (he, they)', cells: ['הוּא', 'הֵם'] },
        { label: 'third person, feminine (she, they)', cells: ['הִיא', 'הֵנָּה'] },
      ],
    },
    worked: [
      { word: 'אֲנִי', ref: 'Jonah 1:9', gloss: 'I', steps: ['It is a word of its own, with no verb joined to it.', 'It is the first person singular: ‘I’.'] },
      { word: 'אַתָּה', ref: 'Jonah 1:14', gloss: 'you', steps: ['It is a word of its own, ending in ה he.', 'It is the second person masculine singular: ‘you’, for one man.'] },
      { word: 'הוּא', ref: 'Jonah 1:10', gloss: 'he', steps: ['It is a word of its own, with a ו vav that belongs to its vowel.', 'It is the third person masculine singular: ‘he’.'] },
    ],
  },
  'he-pronoun-demonstrative': {
    whatItIs: 'A demonstrative points at something: this, that. Hebrew has זֶה ‘this’ for a masculine noun and זֹאת for a feminine one; ‘that’ is הוּא or הִיא with the article.',
    howToSpot: 'Look for זֶה or זֹאת after a noun. When the noun has the article, so has the demonstrative: הָרָעָה הַזֹּאת ‘this calamity’. Matching gender is the check.',
    table: {
      caption: 'This and that',
      columns: ['masculine', 'feminine'],
      rows: [
        { label: 'this', cells: ['זֶה', 'זֹאת'] },
        { label: 'that', cells: ['הַהוּא', 'הַהִיא'] },
      ],
    },
    worked: [
      { word: 'הַזֹּאת', ref: 'Jonah 1:7', gloss: 'this', steps: ['It is זֹאת, the feminine ‘this’, with the article ה on the front.', 'It follows הָרָעָה ‘the calamity’, a feminine noun with the article, and matches it.'] },
      { word: 'הַזֶּה', ref: 'Jonah 1:12', gloss: 'this', steps: ['It is זֶה, the masculine ‘this’, with the article ה on the front.', 'It follows a masculine noun with the article: ‘this great storm’.'] },
      { word: 'זֹּאת', ref: 'Jonah 1:10', gloss: 'this', steps: ['It is זֹאת, the feminine ‘this’, with the dagesh a maqaf leaves in the ז.', 'Here it stands on its own, with no noun: ‘this’ as a pronoun.'] },
    ],
  },
  'he-pronoun-relative': {
    whatItIs: 'A relative pronoun joins a clause to a noun: ‘the man who came’. Hebrew has one, אֲשֶׁר, for who, which and that, and it never changes for gender or number.',
    howToSpot: 'Look for אֲשֶׁר after a noun and before the rest of its clause. A preposition can be written on the front of it: כַּאֲשֶׁר ‘as’, בַּאֲשֶׁר ‘on account of which’.',
    worked: [
      { word: 'אֲשֶׁר', ref: 'Genesis 1:7', gloss: 'which', steps: ['It stands after הַמַּיִם ‘the waters’ and before the clause that tells which waters.', 'It joins them: ‘the waters which are below the expanse’.'] },
      { word: 'כַּאֲשֶׁר', ref: 'Jonah 1:14', gloss: 'as', steps: ['The first letter is כ kaf with a patach: the prefix ‘like’.', 'What follows is אֲשֶׁר, so the word means ‘like which’, that is ‘as’.'] },
      { word: 'בַּאֲשֶׁר', ref: 'Jonah 1:8', gloss: 'on whose account', steps: ['The first letter is ב bet with a patach: the prefix ‘in’.', 'What follows is אֲשֶׁר, so the word means ‘in which’, here ‘on whose account’.'] },
    ],
  },
};
