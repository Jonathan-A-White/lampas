// src/data/grammar/hebrew/teach/verbs.ts — the cards of the Hebrew verbs tier (mw-gdcyf98.12): the root, the Qal and its forms (the perfect, the imperfect, the imperative, the participle, the infinitive), the
// vav-consecutive, the other stems named and told apart by their marks, and the person, gender and number a verb shows. Worked words are of Genesis 1 and Jonah 1.
import type { Teach } from '../../teach/types';

export const VERBS_TEACH: Readonly<Record<string, Teach>> = {
  'he-root': {
    whatItIs: 'Most Hebrew words grow from a root of three consonants that carries the basic sense. Prefixes, endings and vowels are put around the root. English does the same with sing, song and singer.',
    howToSpot: 'Take away the article, the prefixes, the endings and the vowels. Three consonants are left, and they are the root. A dictionary lists a verb under its root.',
    table: {
      caption: 'Three verbs and their roots',
      columns: ['word', 'root letters'],
      rows: [
        { label: 'he created', cells: ['בָּרָא', 'ב ר א'] },
        { label: 'he called', cells: ['קָרָא', 'ק ר א'] },
        { label: 'he spoke', cells: ['אָמַר', 'א מ ר'] },
      ],
    },
    worked: [
      { word: 'הָרֹמֶשֶׂת', ref: 'Genesis 1:21', gloss: 'the one that moves', steps: ['Take off the article הָ at the front and the feminine ending ת at the end.', 'Three letters are left, ר מ שׂ: the root, whose sense is ‘creep’.'] },
      { word: 'הָרֹמֵשׂ', ref: 'Genesis 1:26', gloss: 'the one that moves', steps: ['Take off the article הָ at the front.', 'The same three letters ר מ שׂ are left: the same root, in the masculine.'] },
      { word: 'קָרָא', ref: 'Genesis 1:5', gloss: 'he called', steps: ['There is no prefix and no ending to take off.', 'The three letters ק ר א are the root: ‘call’.'] },
    ],
  },
  'he-qal': {
    whatItIs: 'A Hebrew verb comes in stems, patterns that change its sense. The Qal is the simple one: the plain active sense, with nothing added. Most verbs of the Old Testament are Qal, and a dictionary lists a verb as its Qal.',
    howToSpot: 'Look for a verb with nothing added before its root letters: no נִ, הִ or הִתְ, and no doubled middle letter. A Qal perfect often has a qamats under its first letter: בָּרָא, קָרָא.',
    worked: [
      { word: 'בָּרָא', ref: 'Genesis 1:1', gloss: 'he created', steps: ['Its three letters, ב ר א, stand with vowels between them and nothing added in front.', 'So it is a Qal: the plain sense, ‘he created’.'] },
      { word: 'קָרָא', ref: 'Genesis 1:5', gloss: 'he called', steps: ['Its three letters, ק ר א, stand with vowels between them and nothing added in front.', 'So it is a Qal: ‘he called’.'] },
      { word: 'יָרַד', ref: 'Jonah 1:5', gloss: 'he had gone down', steps: ['Its three letters, י ר ד, stand with vowels between them.', 'It is a Qal: the plain sense of the root, ‘go down’.'] },
    ],
  },
  'he-perfect': {
    whatItIs: 'The perfect is the form for an action seen as a whole and complete: ‘he created’, ‘I have given’. It is the form Hebrew uses most for the past. Who does it is shown by an ending.',
    howToSpot: 'Look at the end of a Qal verb. No ending is ‘he’: בָּרָא. וּ is ‘they’: שָׁרְצוּ. תָּ is ‘you’, and תִּי is ‘I’: נָתַתִּי.',
    table: {
      caption: 'The Qal perfect, with its endings',
      columns: ['example', 'ending'],
      rows: [
        { label: 'he', cells: ['בָּרָא', 'none'] },
        { label: 'they', cells: ['שָׁרְצוּ', 'וּ'] },
        { label: 'you (one man)', cells: ['עָשִׂיתָ', 'תָ'] },
        { label: 'I', cells: ['נָתַתִּי', 'תִּי'] },
      ],
    },
    worked: [
      { word: 'שָׁרְצוּ', ref: 'Genesis 1:21', gloss: 'they teemed', steps: ['The ending is וּ: ‘they’.', 'What is left is שָׁרְצ, the root ש ר צ: ‘teem’.'] },
      { word: 'נָתַתִּי', ref: 'Genesis 1:29', gloss: 'I have given', steps: ['The ending is תִּי: ‘I’.', 'What is left is the root נ ת ן: ‘give’. The last ן nun joins the ת of the ending.'] },
      { word: 'עָשִׂיתָ', ref: 'Jonah 1:10', gloss: 'you have done', steps: ['The ending is תָ: ‘you’, for one man.', 'What is left is the root ע שׂ ה: ‘do’.'] },
    ],
  },
  'he-imperfect': {
    whatItIs: 'The imperfect is the form for an action not seen as complete: it is under way, will happen or may happen. ‘He will be’, ‘they teem’. A short one that wishes is a jussive, and one with ה on the end a cohortative.',
    howToSpot: 'Look at the first letter. י is ‘he’ or ‘they’, ת ‘you’, א ‘I’ and נ ‘we’. A jussive is short: יְהִי ‘let there be’. A cohortative is ‘let us’: נֹאבְדָה.',
    table: {
      caption: 'The Qal imperfect, with its prefixes',
      columns: ['prefix', 'example'],
      rows: [
        { label: 'he', cells: ['י', 'יִהְיֶה'] },
        { label: 'they', cells: ['י', 'יִשְׁרְצוּ'] },
        { label: 'you (one man)', cells: ['ת', 'תִּתֵּן'] },
        { label: 'we', cells: ['נ', 'נֹאבֵד'] },
      ],
    },
    worked: [
      { word: 'יִהְיֶה', ref: 'Genesis 1:29', gloss: 'it will be', steps: ['The first letter is י yod: the prefix ‘he’ or ‘it’.', 'What is left is the root ה י ה: ‘be’. The imperfect looks ahead: ‘it will be’.'] },
      { word: 'יְהִי', ref: 'Genesis 1:3', gloss: 'let there be', steps: ['The first letter is י yod: the prefix ‘he’ or ‘it’.', 'The word is shorter than יִהְיֶה: that is the jussive, which wishes. ‘Let there be’.'] },
      { word: 'נַעֲשֶׂה', ref: 'Genesis 1:26', gloss: 'let us make', steps: ['The first letter is נ nun: the prefix ‘we’.', 'The root is ע שׂ ה: ‘make’. God invites: ‘let us make’.'] },
    ],
  },
  'he-imperative': {
    whatItIs: 'The imperative is the form that gives a command: ‘Go!’, ‘Get up!’. It addresses someone, so it is always second person. It has a masculine and a feminine form, singular and plural.',
    howToSpot: 'Look for a verb with no prefix and no subject before it, often first in its clause. It is the shortest form of the verb: לֵךְ, קוּם. The plural ends in וּ: פְּרוּ.',
    worked: [
      { word: 'קוּם', ref: 'Jonah 1:2', gloss: 'get up', steps: ['There is no prefix and no ending: the bare short form of the verb.', 'It addresses one man: ‘Get up!’'] },
      { word: 'לֵךְ', ref: 'Jonah 1:2', gloss: 'go', steps: ['There is no prefix: the bare short form of the verb.', 'It addresses one man: ‘Go!’'] },
      { word: 'פְּרוּ', ref: 'Genesis 1:22', gloss: 'be fruitful', steps: ['The ending is וּ: the plural, addressing several.', 'What is left is the root פ ר ה: ‘Be fruitful!’'] },
    ],
  },
  'he-participle': {
    whatItIs: 'A participle is a verb used as a describing word: ‘going’, ‘a creeping thing’. It has gender and number like an adjective, but no tense: it tells what someone is doing, or who the doer is.',
    howToSpot: 'Look for a holam after the first letter and a tsere or segol after the second: רוֹמֵשׂ, עֹשֶׂה. The feminine adds ת, and the plural ים or ות. With the article it is a noun: הָרֹמֵשׂ.',
    worked: [
      { word: 'הוֹלֵךְ', ref: 'Jonah 1:11', gloss: 'going', steps: ['A holam follows the first letter, ה, and a tsere follows the second, ל: the shape of a participle.', 'The root is ה ל ך: ‘go’. It tells what the sea was doing: ‘going’.'] },
      { word: 'זֹרֵעַ', ref: 'Genesis 1:29', gloss: 'bearing seed', steps: ['A holam follows the first letter, ז, and a tsere follows the second, ר: the shape of a participle.', 'The root is ז ר ע: ‘sow’. The tree is described as ‘sowing’ seed.'] },
      { word: 'הָרֹמֵשׂ', ref: 'Genesis 1:26', gloss: 'the one that moves', steps: ['The article הָ is on the front, and a participle follows it.', 'With the article the participle works as a noun: ‘the one that creeps’.'] },
    ],
  },
  'he-infinitive': {
    whatItIs: 'The infinitive names an action with no one doing it: ‘to flee’, ‘fleeing’. Hebrew has two. The construct infinitive follows a preposition, most often לְ. The absolute infinitive stands alone to strengthen a verb.',
    howToSpot: 'Look for לְ on the front of a verb with a holam after its second letter: לִבְרֹחַ. Or another preposition: בְּ ‘when’, מִ ‘from’. The table calls this Infinitive construct.',
    worked: [
      { word: 'לִבְרֹחַ', ref: 'Jonah 1:3', gloss: 'to flee', steps: ['The first letter, ל lamed, is the prefix ‘to’.', 'What is left is ב ר ח with a holam after the second letter: ‘to flee’.'] },
      { word: 'לִבְלֹעַ', ref: 'Jonah 1:17', gloss: 'to swallow', steps: ['The first letter, ל lamed, is the prefix ‘to’.', 'What is left is ב ל ע with a holam after the second letter: ‘to swallow’.'] },
      { word: 'לֵאמֹר', ref: 'Genesis 1:22', gloss: 'saying', steps: ['The first letter, ל lamed, is the prefix ‘to’; the root is א מ ר.', 'This infinitive opens a quotation: ‘saying’.'] },
    ],
  },
  'he-vav-consecutive': {
    whatItIs: 'Hebrew tells a story with a vav on the verb. וַ joined to an imperfect gives a past action that follows the one before: וַיִּקְרָא ‘and he called’. A וְ joined to a perfect carries on a future or repeated action.',
    howToSpot: 'Look for וַ at the start of a verb, with a dagesh in the next letter: the table calls it Consecutive imperfect. A וְ before a perfect is called Conjunctive perfect.',
    worked: [
      { word: 'וַיִּקְרָא', ref: 'Genesis 1:5', gloss: 'and he called', steps: ['The first letters are וַ and י, and י has a dagesh: the vav-consecutive and the prefix ‘he’.', 'The root is ק ר א: ‘call’. The story moves on: ‘and he called’.'] },
      { word: 'וַיַּרְא', ref: 'Genesis 1:4', gloss: 'and he saw', steps: ['The first letters are וַ and י, and י has a dagesh: the vav-consecutive and the prefix ‘he’.', 'The root is ר א ה: ‘see’. The story moves on: ‘and he saw’.'] },
      { word: 'וְהָיוּ', ref: 'Genesis 1:14', gloss: 'and let them be', steps: ['The first letter is וְ, with a shewa and no dagesh after it, joined to a perfect: the table calls it Conjunctive perfect.', 'The root is ה י ה: ‘be’. Here it carries on a wish: ‘and let them be’.'] },
    ],
  },
  'he-stems': {
    whatItIs: 'The Qal is the plain stem. Six more change a root’s sense by marks of their own: Niphal (it is done), Piel (done strongly), Pual (the Piel done to him), Hiphil (he causes it), Hophal (it is caused), Hitpael (he does it to himself).',
    howToSpot: 'Look at the verb’s front and middle: נִ is a Niphal, a doubled middle letter a Piel or Pual, הִ or הֵ a Hiphil, הִתְ a Hitpael. The parsing writes Nifal, Hifil, Hofal.',
    table: {
      caption: 'The seven stems and their marks',
      columns: ['mark', 'example'],
      rows: [
        { label: 'Qal', cells: ['none', 'בָּרָא'] },
        { label: 'Nifal (Niphal)', cells: ['נִ on the front', 'נִרְדָּם'] },
        { label: 'Piel', cells: ['the middle letter doubled', 'חִשְּׁבָה'] },
        { label: 'Pual', cells: ['the Piel with a qubuts under the first letter', ''] },
        { label: 'Hifil (Hiphil)', cells: ['הִ or הֵ on the front', 'הֵטִיל'] },
        { label: 'Hofal (Hophal)', cells: ['הָ or הֻ on the front', ''] },
        { label: 'Hitpael (Hithpael)', cells: ['הִתְ on the front', 'יִתְעַשֵּׁת'] },
      ],
      note: 'Pual and Hofal are rare: neither is in Genesis 1 or Jonah 1.',
    },
    worked: [
      { word: 'נִרְדָּם', ref: 'Jonah 1:6', gloss: 'asleep', steps: ['The first letter is נ nun with a hiriq: the mark of the Niphal.', 'The root is ר ד ם, ‘sleep deeply’. The Niphal here is a state: ‘fast asleep’.'] },
      { word: 'חִשְּׁבָה', ref: 'Jonah 1:4', gloss: 'she thought', steps: ['The second letter, ש shin, has a dagesh: the middle letter is doubled, the mark of the Piel.', 'The root is ח ש ב. The Piel gives it its strong sense: the ship ‘thought to be broken’.'] },
      { word: 'הֵטִיל', ref: 'Jonah 1:4', gloss: 'he hurled', steps: ['The first letter is ה he with a tsere: the mark of the Hiphil.', 'The root is ט ו ל, ‘be thrown’. The Hiphil makes it caused: ‘he hurled’.'] },
      { word: 'יִתְעַשֵּׁת', ref: 'Jonah 1:6', gloss: 'he will give thought', steps: ['After the prefix י come תְ and a doubled ש: the mark of the Hitpael.', 'The root is ע ש ת, ‘think’. The Hitpael turns it back on the doer: ‘he will take thought’.'] },
    ],
  },
  'he-person-gender-number': {
    whatItIs: 'A verb shows who does it in an ending or a prefix: the person (I, you, he), the gender (he, she) and the number (one or many). A parsing gives all three: third person masculine singular is ‘he’.',
    howToSpot: 'Read the ending of a perfect or the prefix of an imperfect, and match it to the parsing. In the first person the form is common: it is the same for a man or a woman.',
    table: {
      caption: 'Who does it, in the Qal',
      columns: ['perfect', 'imperfect'],
      rows: [
        { label: 'third person masculine singular (he)', cells: ['בָּרָא', 'יִהְיֶה'] },
        { label: 'third person masculine plural (they)', cells: ['שָׁרְצוּ', 'יִשְׁרְצוּ'] },
        { label: 'second person masculine singular (you)', cells: ['עָשִׂיתָ', 'תִּתֵּן'] },
        { label: 'first person common singular (I)', cells: ['נָתַתִּי', ''] },
        { label: 'first person common plural (we)', cells: ['', 'נֹאבֵד'] },
      ],
    },
    worked: [
      { word: 'שָׁרְצוּ', ref: 'Genesis 1:21', gloss: 'they teemed', steps: ['The ending is וּ, so the person is third and the number plural.', 'The parsing reads: third person common plural, ‘they’.'] },
      { word: 'יִשְׁרְצוּ', ref: 'Genesis 1:20', gloss: 'let them teem', steps: ['The prefix is י and the ending is וּ, so the person is third and the number plural.', 'The parsing reads: third person masculine plural, ‘they’.'] },
      { word: 'עָשִׂיתָ', ref: 'Jonah 1:10', gloss: 'you have done', steps: ['The ending is תָ, so the person is second and the number singular.', 'The parsing reads: second person masculine singular, ‘you’.'] },
    ],
  },
};
