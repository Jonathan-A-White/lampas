// src/data/grammar/hebrew/teach/sounds.ts — the cards of the Hebrew sounds tier (mw-gdcyf98.11): the eight vowel points, the shewa, the dagesh, the mappiq, the furtive patach and the syllable. A card says what a
// mark is and how to find it in a word of Genesis 1 or Jonah 1; how a vowel SOUNDS is the Israeli scheme's lesson for its idea (hebrew-israeli-lessons.ts), never written here.
import { POINT, on } from '../letters';
import type { Teach, WorkedExample } from '../../teach/types';

const BET = 'ב';

/** A vowel's card: what the mark looks like and two words of the text that carry it. */
const vowel = (name: string, look: string, spot: string, worked: [WorkedExample, WorkedExample]): Teach => ({
  whatItIs: `The ${name} is one of the vowel points: a small mark written under, above or inside a consonant. ${look}`,
  howToSpot: spot,
  worked,
});

export const SOUNDS_TEACH: Readonly<Record<string, Teach>> = {
  'he-vowel-patach': vowel('patach', 'It is a short flat line.', `Look under a letter for one flat line, ${on(BET, POINT.patach)}. Do not take it for the qamats, which has a stem under the line.`, [
    { word: 'עַל', ref: 'Jonah 1:7', gloss: 'upon', steps: [`The first letter, ע ayin, has a flat line under it: ${on('ע', POINT.patach)}. That is a patach.`, 'ל lamed follows, to its left, with no mark.'] },
    { word: 'מַיִם', ref: 'Genesis 1:6', gloss: 'water', steps: [`Under the first letter, מ mem, is a flat line: ${on('מ', POINT.patach)}. That is a patach.`, `Then י yod with a dot under it, and ם mem in its end-of-word shape.`] },
  ]),
  'he-vowel-qamats': vowel('qamats', 'It is a flat line with a small stem under it.', `Look under a letter for a flat line with a stem, ${on(BET, POINT.qamats)}. Do not take it for the patach, which is only a flat line.`, [
    { word: 'בָּרָא', ref: 'Genesis 1:27', gloss: 'he created', steps: [`The first letter, ב bet, has a flat line with a stem under it: ${on(BET, POINT.dagesh, POINT.qamats)}. That is a qamats.`, `The second letter, ר resh, has one too: ${on('ר', POINT.qamats)}. א alef ends the word.`] },
    { word: 'הָאָרֶץ', ref: 'Genesis 1:28', gloss: 'the earth', steps: [`The first two letters, ה he and א alef, each have a qamats under them: ${on('ה', POINT.qamats)}, ${on('א', POINT.qamats)}.`, 'Then ר resh, and ץ tsade in its end-of-word shape.'] },
  ]),
  'he-vowel-segol': vowel('segol', 'It is three dots in a triangle.', `Look under a letter for three dots, one pointing down: ${on(BET, POINT.segol)}. Do not take it for the tsere, which has two.`, [
    { word: 'אֶרֶץ', ref: 'Genesis 1:24', gloss: 'earth', steps: [`The first letter, א alef, has three dots under it: ${on('א', POINT.segol)}. That is a segol.`, `ר resh has one too: ${on('ר', POINT.segol)}. The word ends with ץ tsade in its end-of-word shape.`] },
    { word: 'עֶרֶב', ref: 'Genesis 1:31', gloss: 'evening', steps: [`The first letter, ע ayin, has a segol under it: ${on('ע', POINT.segol)}.`, `ר resh has a segol too: ${on('ר', POINT.segol)}. Then ב bet ends the word.`] },
  ]),
  'he-vowel-tsere': vowel('tsere', 'It is two dots side by side.', `Look under a letter for two dots in a row, ${on(BET, POINT.tsere)}. Do not take it for the segol, which has three dots.`, [
    { word: 'בֵּין', ref: 'Genesis 1:18', gloss: 'between', steps: [`The first letter, ב bet, has two dots under it: ${on(BET, POINT.dagesh, POINT.tsere)}. That is a tsere.`, 'After it come י yod and ן nun in its end-of-word shape.'] },
    { word: 'פְּנֵי', ref: 'Genesis 1:29', gloss: 'face', steps: [`The second letter, נ nun, has two dots under it: ${on('נ', POINT.tsere)}. That is a tsere.`, 'פ pe comes first, with a dot inside it and two dots under it, and י yod ends the word.'] },
  ]),
  'he-vowel-hiriq': vowel('hiriq', 'It is a single dot.', `Look under a letter for one dot, ${on(BET, POINT.hiriq)}. A yod after it can be part of the vowel.`, [
    { word: 'אִישׁ', ref: 'Jonah 1:7', gloss: 'man', steps: [`The first letter, א alef, has a dot under it: ${on('א', POINT.hiriq)}. That is a hiriq.`, 'After it come י yod, which here belongs to the vowel, and ש shin.'] },
    { word: 'כִּי', ref: 'Jonah 1:14', gloss: 'for', steps: [`The first letter, כ kaf, has a dot inside it and a dot under it: ${on('כ', POINT.dagesh, POINT.hiriq)}. The dot under it is a hiriq.`, 'The yod that follows belongs to the vowel.'] },
  ]),
  'he-vowel-holam': vowel('holam', 'It is a dot above and to the left of a letter.', `Look for a dot high on the left of a letter, ${on(BET, POINT.holam)}, or over a vav, ${on('ו', POINT.holam)}. The vav then belongs to the vowel.`, [
    { word: 'אוֹר', ref: 'Genesis 1:3', gloss: 'light', steps: [`After א alef comes ו vav with a dot above it: ${on('ו', POINT.holam)}. That is a holam, and the vav belongs to it.`, 'ר resh ends the word.'] },
    { word: 'תֹהוּ', ref: 'Genesis 1:2', gloss: 'emptiness', steps: [`The first letter, ת tav, has a dot above and to its left: ${on('ת', POINT.holam)}. That is a holam written without a vav.`, `Then ה he and ו vav with a dot inside it: ${on('ו', POINT.dagesh)}.`] },
  ]),
  'he-vowel-qubuts': vowel('qubuts', 'It is three small dots in a slanting line.', `Look under a letter for three dots going down to the right, ${on(BET, POINT.qubuts)}. Do not take it for the segol, which is a triangle.`, [
    { word: 'וְכִבְשֻׁהָ', ref: 'Genesis 1:28', gloss: 'and subdue it', steps: [`Under ש shin, which has a dot above its right arm, are three dots in a slant: ${on('ש', POINT.shinDot, POINT.qubuts)}. They are a qubuts.`, 'The letters before it are ו vav, כ kaf and ב bet, read from the right; ה he ends the word.'] },
    { word: 'וַיְטִלֻהוּ', ref: 'Jonah 1:15', gloss: 'and they cast him', steps: [`Under ל lamed are three dots in a slant: ${on('ל', POINT.qubuts)}. They are a qubuts.`, 'Then ה he and ו vav with a dot inside it.'] },
  ]),
  'he-vowel-shuruq': vowel('shuruq', 'It is a vav with a dot inside it.', `Look for a ו with a dot in its middle, ${on('ו', POINT.dagesh)}. It follows a consonant and is a vowel, not a consonant with a dot.`, [
    { word: 'וְרוּחַ', ref: 'Genesis 1:2', gloss: 'and spirit', steps: [`After ר resh stands ו vav with a dot inside it: ${on('ו', POINT.dagesh)}. That is a shuruq.`, 'The first ו vav, at the start of the word, has two dots under it and is a letter of its own.'] },
    { word: 'וּבֵין', ref: 'Genesis 1:18', gloss: 'and between', steps: [`The word begins with ו vav with a dot inside it: ${on('ו', POINT.dagesh)}. Here it is a shuruq.`, 'Then ב bet, י yod and ן nun in its end-of-word shape.'] },
  ]),
  'he-vowel-shewa': {
    whatItIs: `The shewa is two dots one above the other under a consonant: ${on(BET, POINT.shewa)}. It is vocal at the start of a word or of a syllable, and after a long vowel; it is silent when it closes a syllable.`,
    howToSpot: 'Look for a stack of two dots under a letter, and ask where the letter stands. At the head of a word it is vocal. Closing a syllable, after a short vowel, it is silent.',
    table: {
      caption: 'The shewa, by where it stands',
      columns: ['Where'],
      rows: [
        { label: 'Vocal', cells: ['at the start of a word, at the start of a syllable, or after a long vowel'] },
        { label: 'Silent', cells: ['closing a syllable, after a short vowel'] },
      ],
    },
    worked: [
      { word: 'בְּרֵאשִׁית', ref: 'Genesis 1:1', gloss: 'in the beginning', steps: [`The word begins with ${on(BET, POINT.dagesh, POINT.shewa)}: a shewa under the very first letter, so it is vocal.`, 'The rest of the word has full vowels.'] },
      { word: 'וְיִרְדּוּ', ref: 'Genesis 1:26', gloss: 'and let them rule', steps: [`The first letter, ו vav, has a shewa at the start of the word: it is vocal.`, `The shewa under ר resh, ${on('ר', POINT.shewa)}, comes after a short vowel and closes the syllable יִר: it is silent.`] },
    ],
  },
  'he-dagesh': {
    whatItIs: 'The dagesh is a dot inside a letter. A dagesh lene is in bet, gimel, dalet, kaf, pe or tav at the start of a word or after a consonant with no vowel. A dagesh forte is in any other letter, after a vowel, and doubles it.',
    howToSpot: 'Find a dot inside a letter, then ask which kind. The table sets the two side by side.',
    table: {
      caption: 'The dagesh',
      columns: ['In which letters', 'Where'],
      rows: [
        { label: 'Lene', cells: ['ב ג ד כ פ ת', 'at the start of a word, or after a consonant with no vowel'] },
        { label: 'Forte', cells: ['any other letter, and these six', 'after a vowel'] },
      ],
    },
    worked: [
      { word: 'בְּרֵאשִׁית', ref: 'Genesis 1:1', gloss: 'in the beginning', steps: [`The word begins with ${on(BET, POINT.dagesh)}: a dot inside ב bet at the start of a word is a dagesh lene.`, 'There is no vowel before it for the dot to follow.'] },
      { word: 'הַשָּׁמַיִם', ref: 'Genesis 1:1', gloss: 'the heavens', steps: [`ש shin has a dot inside it, after the vowel under ה he: ${on('ש', POINT.dagesh, POINT.shinDot, POINT.qamats)}. That is a dagesh forte.`, 'It follows a vowel, and shin is not one of the six.'] },
    ],
  },
  'he-mappiq': {
    whatItIs: `The mappiq is a dot inside a he at the very end of a word: ${on('ה', POINT.dagesh)}. It looks like the dagesh, but it shows that this he is a consonant, not the quiet ending of a word.`,
    howToSpot: 'Look at the last letter of the word. A he with a dot in it, at the left-hand end, is a he with a mappiq. A he at the end with no dot is the ordinary ending.',
    worked: [
      { word: 'לְמִינָהּ', ref: 'Genesis 1:25', gloss: 'to its kind', steps: [`The last letter, at the left, is ה he with a dot inside it: ${on('ה', POINT.dagesh)}. That is a mappiq.`, 'The word reads from the right: ל lamed, then מ mem, י yod, נ nun and ה he.'] },
      { word: 'בָּהּ', ref: 'Jonah 1:3', gloss: 'in it', steps: [`The word ends in ה he with a dot inside it: ${on('ה', POINT.dagesh)}. That is a mappiq.`, 'The first letter is ב bet, with a dot inside it and a qamats under it.'] },
    ],
  },
  'he-furtive-patach': {
    whatItIs: 'A furtive patach is a patach under the last letter of a word when that letter is chet, ayin or he with a mappiq and the vowel before it is long. It is written under the letter but is read just before it.',
    howToSpot: 'Look at the last letter of a word. If it is ח, ע or הּ and it carries a patach, and the letter before it has a long vowel, the patach is furtive.',
    worked: [
      { word: 'רָקִיעַ', ref: 'Genesis 1:6', gloss: 'expanse', steps: [`The last letter, at the left, is ע ayin with a flat line under it: ${on('ע', POINT.patach)}.`, 'The vowel before it is a hiriq with a yod, a long vowel, so this patach is furtive.'] },
      { word: 'וְרוּחַ', ref: 'Genesis 1:2', gloss: 'and spirit', steps: [`The last letter, at the left, is ח chet with a flat line under it: ${on('ח', POINT.patach)}.`, 'The vowel before it is a shuruq, a long vowel, so this patach is furtive.'] },
    ],
  },
  'he-syllable': {
    whatItIs: 'A Hebrew syllable begins with one consonant and has one vowel. It is open if it ends in its vowel and closed if a consonant follows the vowel. A word has as many syllables as it has vowels.',
    howToSpot: 'Count the vowels of the word: that is the number of syllables. Cut the word just before each consonant that begins a new vowel.',
    worked: [
      { word: 'בָּרָא', ref: 'Genesis 1:27', gloss: 'he created', steps: [`The word has two vowels, two qamats, so it has two syllables.`, `The first is ${on(BET, POINT.dagesh, POINT.qamats)}, an open syllable; the second is ר resh with its qamats, followed by א alef.`] },
      { word: 'אֱלֹהִים', ref: 'Genesis 1:31', gloss: 'God', steps: [`The word has three vowels, so it has three syllables: ${on('א', 'ֱ')}, ${on('ל', POINT.holam)} and ${on('ה', POINT.hiriq)}ים.`, 'The last syllable is closed: a consonant, ם mem in its end-of-word shape, follows its vowel.'] },
    ],
  },
};
