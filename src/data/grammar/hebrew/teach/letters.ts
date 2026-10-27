// src/data/grammar/hebrew/teach/letters.ts — the cards of the Hebrew letters tier (mw-gdcyf98.11): the alphabet, the 22 letters, the final forms, the pairs the dagesh makes and shin and
// sin. Written so a total beginner learns the idea from the card alone, with worked words from Genesis 1 and Jonah 1 (tests/unit/hebrew-ladder.test.ts reads each against public/data).
// How a letter SOUNDS is never written here: it is the Israeli scheme's lesson for the idea (src/speech/schemes/hebrew-israeli-lessons.ts), shown under 'How it sounds'.
import { HEBREW_FINALS, HEBREW_LETTERS, POINT, hebrewLetterOfGlyph, on, type HebrewLetter } from '../letters';
import type { Teach, WorkedExample } from '../../teach/types';

const ORDER = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** The letters of a word, right to left, each as it is written with its name: 'ם mem'. A final shape is named for its letter. */
const spelledLetters = (word: string): { glyph: string; letter: HebrewLetter }[] =>
  [...word.normalize('NFD')].flatMap((c) => {
    const letter = c >= 'א' && c <= 'ת' ? hebrewLetterOfGlyph(c) : undefined;
    return letter ? [{ glyph: c, letter }] : [];
  });

/**
 * A word taken apart letter by letter, from the right, with a line on where `letter` (a letter's key, or none) stands in it. The word is a word of Genesis 1 or Jonah 1 in the form the card shows
 * (no cantillation, no maqaf, hebrewBare): `ref` and `word` are checked against the chapter.
 */
export function spelledWord(word: string, ref: string, gloss: string, key?: string): WorkedExample {
  const letters = spelledLetters(word);
  const read = `Read from the right: ${letters.map((l) => `${l.glyph} ${l.letter.name.toLowerCase()}`).join(', ')}.`;
  const at = key === undefined ? -1 : letters.findIndex((l) => l.letter.key === key);
  const where =
    at < 0
      ? `The word has ${letters.length} letters.`
      : `${letters[at].glyph} ${letters[at].letter.name.toLowerCase()} is the ${at === letters.length - 1 && letters.length > 1 ? 'last' : (ORDER[at] ?? `${at + 1}th`)} letter, counting from the right.`;
  return { word, ref, gloss, steps: [read, where] };
}

const w = (word: string, ref: string, gloss: string, key?: string): WorkedExample => spelledWord(word, ref, gloss, key);

/** Where each letter's worked words come from: [word, reference, gloss]. */
const LETTER_WORDS: Readonly<Record<string, readonly [string, string, string][]>> = {
  alef: [['אוֹר', 'Genesis 1:3', 'light'], ['אֱלֹהִים', 'Genesis 1:31', 'God']],
  bet: [['בָּרָא', 'Genesis 1:27', 'he created'], ['בֹקֶר', 'Genesis 1:31', 'morning']],
  gimel: [['גָּדוֹל', 'Jonah 1:17', 'great'], ['גּוֹרָלוֹת', 'Jonah 1:7', 'lots']],
  dalet: [['דָּג', 'Jonah 1:17', 'fish'], ['דֶּשֶׁא', 'Genesis 1:12', 'vegetation']],
  he: [['הָיְתָה', 'Genesis 1:2', 'she was'], ['הָאָרֶץ', 'Genesis 1:28', 'the earth']],
  vav: [['וָבֹהוּ', 'Genesis 1:2', 'and void'], ['וְרוּחַ', 'Genesis 1:2', 'and spirit']],
  zayin: [['זֶרַע', 'Genesis 1:29', 'seed'], ['זָכָר', 'Genesis 1:27', 'male']],
  chet: [['חַיָּה', 'Genesis 1:30', 'living creature'], ['הַחֹשֶׁךְ', 'Genesis 1:4', 'the darkness']],
  tet: [['טוֹב', 'Genesis 1:31', 'good'], ['הֵטִיל', 'Jonah 1:4', 'he hurled']],
  yod: [['יוֹם', 'Genesis 1:31', 'day'], ['יַמִּים', 'Genesis 1:10', 'seas']],
  kaf: [['כָּל', 'Genesis 1:31', 'all'], ['כָּנָף', 'Genesis 1:21', 'wing']],
  lamed: [['לָיְלָה', 'Genesis 1:5', 'night'], ['לֵאמֹר', 'Genesis 1:22', 'saying']],
  mem: [['מַיִם', 'Genesis 1:6', 'water'], ['מָקוֹם', 'Genesis 1:9', 'place']],
  nun: [['נֶפֶשׁ', 'Genesis 1:30', 'life'], ['נָתַתִּי', 'Genesis 1:29', 'I have given']],
  samekh: [['סַעַר', 'Jonah 1:4', 'storm']],
  ayin: [['עֵץ', 'Genesis 1:29', 'tree'], ['עֶרֶב', 'Genesis 1:31', 'evening']],
  pe: [['פְּרִי', 'Genesis 1:12', 'fruit'], ['פְּנֵי', 'Genesis 1:29', 'face']],
  tsade: [['בְּצַלְמֵנוּ', 'Genesis 1:26', 'in our image'], ['תּוֹצֵא', 'Genesis 1:24', 'let it bring forth']],
  qof: [['קָרָא', 'Genesis 1:10', 'he called'], ['קוּם', 'Jonah 1:6', 'get up']],
  resh: [['רָקִיעַ', 'Genesis 1:6', 'expanse'], ['רֶמֶשׂ', 'Genesis 1:25', 'crawling thing']],
  shin: [['שָׁמָיִם', 'Genesis 1:8', 'sky'], ['שֵׁנִי', 'Genesis 1:8', 'second']],
  tav: [['תְהוֹם', 'Genesis 1:2', 'deep'], ['תֹהוּ', 'Genesis 1:2', 'emptiness']],
};

/** What each letter looks like is in the letter's own data (letters.ts); this adds the one thing a beginner is told of it. */
const letterCard = (letter: HebrewLetter): Teach => ({
  whatItIs: `${letter.name} is a letter of the Hebrew alphabet, written ${letter.letter}${letter.final ? ` and, at the end of a word, ${letter.final}` : ''}. Like every Hebrew letter it is a consonant, and it is read from the right in a word.`,
  howToSpot: `${letter.line} Find it in the worked word, reading from the right.`,
  worked: LETTER_WORDS[letter.key].map(([word, ref, gloss]) => w(word, ref, gloss, letter.key)),
});

const alphabetCard: Teach = {
  whatItIs:
    'Hebrew has 22 letters, all consonants: the vowels are small marks added to them, which you meet later. Hebrew is read from right to left, the other way round from English. Each letter has a name.',
  howToSpot: 'Start at the right-hand end of a word and read toward the left, naming each letter by its shape: א is alef, ב is bet. The table gives all 22 in order.',
  table: {
    caption: 'The 22 letters, in order',
    columns: ['Letter'],
    rows: HEBREW_LETTERS.map((l) => ({ label: l.name, cells: [l.letter] })),
    note: 'Five have a second shape at the end of a word: ך ם ן ף ץ.',
  },
  worked: [w('אוֹר', 'Genesis 1:3', 'light'), w('שָׁמָיִם', 'Genesis 1:8', 'sky')],
};

const finalFormsCard: Teach = {
  whatItIs: 'Five letters have two shapes. One is for the start and the middle of a word, the other, the final form, is used only when the letter ends a word. It is the same letter.',
  howToSpot: 'A letter that drops below the line, or closes all round, at the left-hand end of a word is a final form. The table pairs each with its ordinary shape.',
  table: {
    caption: 'The five final forms',
    columns: ['Ordinary', 'Final'],
    rows: HEBREW_FINALS.map((l) => ({ label: l.name, cells: [l.letter, l.final!] })),
  },
  worked: [w('אֱלֹהִים', 'Genesis 1:31', 'God'), w('הָאָרֶץ', 'Genesis 1:28', 'the earth'), w('בְּתוֹךְ', 'Genesis 1:6', 'in the midst of'), w('כָּנָף', 'Genesis 1:21', 'wing'), w('כֵן', 'Genesis 1:30', 'so')],
};

const pairCard = (name: string, letter: string, dotted: string, undotted: string, words: [WorkedExample, WorkedExample]): Teach => ({
  whatItIs: `${name} is one letter in two forms. With a dot inside it, the dagesh, it is written ${dotted}; with no dot it is written ${undotted}. A reader treats the two as two letters.`,
  howToSpot: `Look inside the letter ${letter}: a dot in the middle of its body is the dagesh. Which form a word has depends on where the letter stands: the dagesh lene is explained on its own card.`,
  worked: words,
});

const shinSinCard: Teach = {
  whatItIs: `Shin and sin are written with one letter, ש, and a dot above it. A dot over its right arm makes it shin, ${on('ש', POINT.shinDot)}; a dot over its left arm makes it sin, ${on('ש', POINT.sinDot)}. A reader treats them as two letters.`,
  howToSpot: 'Find the three-armed letter ש, then look at the small dot above it: at the right it is shin, at the left it is sin. In many texts the dot of a shin is not written at all.',
  worked: [
    { word: 'שָׁמָיִם', ref: 'Genesis 1:8', gloss: 'sky', steps: [`The first letter is ${on('ש', POINT.shinDot)}: its dot is over the right arm, so it is shin.`, 'Then מ mem, י yod and ם mem in its end-of-word shape.'] },
    { word: 'רֶמֶשׂ', ref: 'Genesis 1:25', gloss: 'crawling thing', steps: [`The last letter, at the left, is ${on('ש', POINT.sinDot)}: its dot is over the left arm, so it is sin.`, 'Before it come מ mem and ר resh, read from the right.'] },
  ],
};

export const LETTERS_TEACH: Readonly<Record<string, Teach>> = {
  'he-alphabet': alphabetCard,
  ...Object.fromEntries(HEBREW_LETTERS.map((l) => [l.id, letterCard(l)])),
  'he-final-forms': finalFormsCard,
  'he-pair-bet-vet': pairCard('Bet', 'ב', on('ב', POINT.dagesh), 'ב', [w('בְּרֵאשִׁית', 'Genesis 1:1', 'in the beginning', 'bet'), w('וָבֹהוּ', 'Genesis 1:2', 'and void', 'bet')]),
  'he-pair-kaf-khaf': pairCard('Kaf', 'כ', on('כ', POINT.dagesh), 'כ', [w('כִּי', 'Jonah 1:14', 'for', 'kaf'), w('כֵן', 'Genesis 1:30', 'so', 'kaf')]),
  'he-pair-pe-fe': pairCard('Pe', 'פ', on('פ', POINT.dagesh), 'פ', [w('פְּרִי', 'Genesis 1:12', 'fruit', 'pe'), w('מְרַחֶפֶת', 'Genesis 1:2', 'hovering', 'pe')]),
  'he-shin-sin': shinSinCard,
};
