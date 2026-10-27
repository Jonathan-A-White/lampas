// src/data/grammar/hebrew/teach/prepositions.ts — the cards of the Hebrew prepositions tier (mw-gdcyf98.12): the prefixed prepositions ב כ ל, מִן, the object marker אֵת and the vav. Worked words are of Genesis 1 and Jonah 1.
import type { Teach } from '../../teach/types';

export const PREPOSITIONS_TEACH: Readonly<Record<string, Teach>> = {
  'he-prep-inseparable': {
    whatItIs: 'A preposition links a noun to the sentence: in, to, like. Three of the commonest are one letter written on the front of the noun: בְּ ‘in’, כְּ ‘like’ and לְ ‘to’. They cannot stand alone.',
    howToSpot: 'Look at the first letter: ב, כ or ל with a shewa under it, for example לְמִינוֹ. Before a noun with the article the ה of the article drops out and its vowel moves to the preposition: בַּיּוֹם ‘in the day’.',
    table: {
      caption: 'The three prefixes',
      columns: ['prefix', 'meaning', 'before the article'],
      rows: [
        { label: 'ב', cells: ['בְּ', 'in', 'בַּ'] },
        { label: 'כ', cells: ['כְּ', 'like', 'כַּ'] },
        { label: 'ל', cells: ['לְ', 'to', 'לַ'] },
      ],
    },
    worked: [
      { word: 'בְּרֵאשִׁית', ref: 'Genesis 1:1', gloss: 'in the beginning', steps: ['The first letter, ב bet with a shewa, is the prefix ‘in’.', 'What is left is the noun רֵאשִׁית ‘beginning’.'] },
      { word: 'בַּיּוֹם', ref: 'Genesis 1:18', gloss: 'in the day', steps: ['ב bet with a patach is ‘in’, with the ה of the article joined in: the ה has dropped out.', 'The י yod has a dagesh, which the article leaves behind. The noun is יוֹם ‘day’.'] },
      { word: 'לַיַּבָּשָׁה', ref: 'Genesis 1:10', gloss: 'to the dry land', steps: ['ל lamed with a patach is ‘to’, with the article joined in.', 'The י yod has a dagesh, and the noun is יַבָּשָׁה ‘dry land’.'] },
    ],
  },
  'he-prep-min': {
    whatItIs: 'The preposition מִן means ‘from’ or ‘out of’, and, in a comparison, ‘than’. It is often written as מִ on the front of a noun, like the three prefixes.',
    howToSpot: 'Look for מִ or מֵ at the start of a word, or the whole word מִן. After מִ the next letter often has a dagesh: מִתַּחַת. Before a letter that cannot take one, מֵ has a tsere: מֵעַל.',
    worked: [
      { word: 'מִתַּחַת', ref: 'Genesis 1:7', gloss: 'from under', steps: ['The first letter, מ mem with a hiriq, is ‘from’.', 'The next letter, ת tav, has a dagesh. What is left is תַּחַת ‘under’.'] },
      { word: 'מֵעַל', ref: 'Genesis 1:7', gloss: 'from above', steps: ['The first letter, מ mem with a tsere, is ‘from’. It has a tsere because the next letter, ע ayin, cannot take a dagesh.', 'What is left is עַל ‘upon’.'] },
      { word: 'מִזַּעְפּוֹ', ref: 'Jonah 1:15', gloss: 'from his raging', steps: ['The first letter, מ mem with a hiriq, is ‘from’.', 'What is left is זַעְפּוֹ ‘his raging’, a noun with the suffix וֹ.'] },
    ],
  },
  'he-object-marker': {
    whatItIs: 'In “God made the light”, the light is the object: the thing the verb acts on. Hebrew often puts a small word, אֵת, before a definite object. It marks the object and is not translated.',
    howToSpot: 'Look for אֵת or אֶת־ before a noun with the article, or a name. With a suffix it becomes a pronoun: אֹתוֹ ‘him’, אֹתָם ‘them’.',
    worked: [
      { word: 'אֵת', ref: 'Genesis 1:1', gloss: 'object marker', steps: ['It stands before הַשָּׁמַיִם ‘the heavens’, the thing God created.', 'It marks that noun as the object. English has no word to put for it.'] },
      { word: 'אֶת', ref: 'Genesis 1:4', gloss: 'object marker', steps: ['It stands before הָאוֹר ‘the light’, joined to it by a maqaf.', 'It marks the light as the thing God saw.'] },
      { word: 'אֹתוֹ', ref: 'Genesis 1:27', gloss: 'him', steps: ['The marker אֵת has a suffix וֹ added: ‘him’.', 'So the object is a pronoun: ‘He created him’.'] },
    ],
  },
  'he-vav': {
    whatItIs: 'The letter ו on the front of a word means ‘and’. It is a word written as one letter, joined to the word after it. It can also mean ‘but’ or ‘so’. It joins words, phrases and whole sentences.',
    howToSpot: 'Look for ו at the start of a word, usually with a shewa: וְ. Before ב, מ or פ, and before a shewa, it is וּ. It can stand before another prefix: וּבֵין ‘and between’.',
    worked: [
      { word: 'וְרוּחַ', ref: 'Genesis 1:2', gloss: 'and spirit', steps: ['The first letter, ו vav with a shewa, is ‘and’.', 'What is left is רוּחַ ‘spirit’.'] },
      { word: 'וּבֵין', ref: 'Genesis 1:18', gloss: 'and between', steps: ['The first letter is ו vav with a dot inside it, וּ: the form before ב.', 'What is left is בֵּין ‘between’.'] },
      { word: 'וְהָאָרֶץ', ref: 'Genesis 1:2', gloss: 'and the earth', steps: ['The first letter, ו vav with a shewa, is ‘and’.', 'What is left is הָאָרֶץ ‘the earth’, with the article.'] },
    ],
  },
};
