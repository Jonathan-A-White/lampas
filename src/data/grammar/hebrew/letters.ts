// src/data/grammar/hebrew/letters.ts — the 22 letters of Hebrew and their five final forms (mw-gdcyf98.11, docs/grammar.md 'The Hebrew ladder'): the letter drill's 27 glyphs and the
// ideas 'he-letter-alef' to 'he-letter-tav' of the Hebrew ladder (hebrew/ladder.ts). How a letter SOUNDS is never written here: it is the Israeli scheme's lesson
// (src/speech/schemes/hebrew-israeli-lessons.ts), found by `lesson`, the id the scheme keys it by. Pure data.
import { stripCantillation } from '../../../speech/schemes/hebrew-israeli';

export interface HebrewLetter {
  /** the ending of the idea's id: 'alef' */
  key: string;
  /** the idea's id, 'he-letter-alef' */
  id: string;
  /** what the letter is called: 'Alef' */
  name: string;
  /** the letter as it is written at the start and in the middle of a word */
  letter: string;
  /** its second shape at the end of a word, for the five that have one */
  final?: string;
  /** the id of the Israeli scheme's sound lesson for it (the idea's own id) */
  lesson: string;
  /** a line on how it looks and what it must not be taken for; it names no sound */
  line: string;
}

const L = (key: string, name: string, letter: string, line: string, final?: string): HebrewLetter => ({ key, id: `he-letter-${key}`, name, letter, ...(final ? { final } : {}), lesson: `he-letter-${key}`, line });

/** The letters in their order, alef to tav. */
export const HEBREW_LETTERS: readonly HebrewLetter[] = [
  L('alef', 'Alef', 'א', 'א is a slanted line with a dot-like stroke above and below it.'),
  L('bet', 'Bet', 'ב', 'ב is a box open at the left, with a line along its foot. Do not take it for כ (kaf), which is round.'),
  L('gimel', 'Gimel', 'ג', 'ג is like a small bent leg with a foot at the left. It is not נ (nun).'),
  L('dalet', 'Dalet', 'ד', 'ד has a flat roof with a corner at the top right. Do not take it for ר (resh), whose corner is round.'),
  L('he', 'He', 'ה', 'ה is a roof and a right-hand wall with a small leg at the left. Do not take it for ח (chet), which is joined.'),
  L('vav', 'Vav', 'ו', 'ו is a plain hook: a short vertical stroke. Do not take it for ז (zayin), which has a bar on top.'),
  L('zayin', 'Zayin', 'ז', 'ז is a vertical stroke with a bar on top, like a crown on ו.'),
  L('chet', 'Chet', 'ח', 'ח is an arch with a joined roof and two legs. Do not take it for ה (he), whose left leg stands apart.'),
  L('tet', 'Tet', 'ט', 'ט is a round bowl turned inward, with a hook at the top.'),
  L('yod', 'Yod', 'י', 'י is the smallest letter: a tiny hook that hangs from the top of the line.'),
  L('kaf', 'Kaf', 'כ', 'כ is rounded like a cup open to the left. Its end-of-word shape ך is a long stroke down.', 'ך'),
  L('lamed', 'Lamed', 'ל', 'ל is the tallest letter: its top climbs above the line.'),
  L('mem', 'Mem', 'מ', 'מ is an open bowl with a sloping stroke. Its end-of-word shape ם is closed all round.', 'ם'),
  L('nun', 'Nun', 'נ', 'נ is a small hook turned up. Its end-of-word shape ן is a long stroke down.', 'ן'),
  L('samekh', 'Samekh', 'ס', 'ס is a closed circle. Do not take it for the final ם (mem), which has a square corner.'),
  L('ayin', 'Ayin', 'ע', 'ע is a bowl with a long stroke across it, like a Y.'),
  L('pe', 'Pe', 'פ', 'פ is a curl closed over itself, like a mouth. Its end-of-word shape ף has a long tail down.', 'ף'),
  L('tsade', 'Tsade', 'צ', 'צ has a small hook and a stroke that sweeps down to the left. Its end-of-word shape ץ ends in a long tail.', 'ץ'),
  L('qof', 'Qof', 'ק', 'ק is like כ with a stroke down below the line.'),
  L('resh', 'Resh', 'ר', 'ר has a round corner at the top right. Do not take it for ד (dalet), whose corner is sharp.'),
  L('shin', 'Shin', 'ש', 'ש has three arms and a dot above: at the right it is shin, and at the left sin.'),
  L('tav', 'Tav', 'ת', 'ת is like ח with a small foot at the left. Do not take it for ה (he).'),
];

/** The 22 letters' idea ids, alef to tav. */
export const HEBREW_LETTER_IDEAS: readonly string[] = HEBREW_LETTERS.map((l) => l.id);

/** The letters that have a second shape at the end of a word. */
export const HEBREW_FINALS: readonly HebrewLetter[] = HEBREW_LETTERS.filter((l) => l.final !== undefined);

/** The 27 glyphs the letter drill asks: the 22 letters, then the 5 final forms. */
export const HEBREW_GLYPHS: readonly string[] = [...HEBREW_LETTERS.map((l) => l.letter), ...HEBREW_FINALS.map((l) => l.final!)];

/** The letter whose idea this is, or undefined for any other idea. */
export const hebrewLetterOf = (ideaId: string): HebrewLetter | undefined => HEBREW_LETTERS.find((l) => l.id === ideaId);

/** The letter a glyph is, in either of its shapes (ם is mem), or undefined. */
export const hebrewLetterOfGlyph = (glyph: string): HebrewLetter | undefined => HEBREW_LETTERS.find((l) => l.letter === glyph || l.final === glyph);

/**
 * A Hebrew word as a card shows it: the letters and the vowel points, with no cantillation, no maqaf and no sof pasuq (and no paragraph sign after it), in NFC.
 * A card's worked word is a word of its verse in this form (tests/unit/hebrew-ladder.test.ts reads it against public/data).
 */
export function hebrewBare(text: string): string {
  return stripCantillation(text.normalize('NFC').replace(/\u05C3[\u05E4\u05E1]?$/u, '')).replace(/\u05BE/gu, '').normalize('NFC');
}

/** The consonants of a word: no points, no marks, a final shape written as its letter (ם is מ). */
export function hebrewConsonants(text: string): string {
  const finals = new Map(HEBREW_FINALS.map((l) => [l.final!, l.letter]));
  return [...text.normalize('NFD')].filter((c) => c >= '\u05D0' && c <= '\u05EA').map((c) => finals.get(c) ?? c).join('');
}

/** The points and signs of a pointed text, by name (the cards and their texts write a mark on a letter with `on`, so no combining mark is typed by hand). */
export const POINT = {
  shewa: 'ְ',
  hiriq: 'ִ',
  tsere: 'ֵ',
  segol: 'ֶ',
  patach: 'ַ',
  qamats: 'ָ',
  holam: 'ֹ',
  qubuts: 'ֻ',
  dagesh: 'ּ',
  shinDot: 'ׁ',
  sinDot: 'ׂ',
  maqaf: '־',
  sofPasuq: '׃',
} as const;

/** A letter with marks on it: `on('ב', POINT.patach)` is בַ. */
export const on = (letter: string, ...marks: string[]): string => `${letter}${marks.join('')}`;

/** Letters a reader mistakes for each other, by idea id (ב and כ, ד and ר, ה and ח, ח and ת, ו and ז, ג and נ, ס and ם): the near misses of the letter drill's choices. */
export const HEBREW_LOOK_ALIKES: readonly [string, string][] = [
  ['he-letter-bet', 'he-letter-kaf'],
  ['he-letter-dalet', 'he-letter-resh'],
  ['he-letter-he', 'he-letter-chet'],
  ['he-letter-chet', 'he-letter-tav'],
  ['he-letter-he', 'he-letter-tav'],
  ['he-letter-vav', 'he-letter-zayin'],
  ['he-letter-gimel', 'he-letter-nun'],
  ['he-letter-samekh', 'he-letter-mem'],
  ['he-letter-ayin', 'he-letter-tsade'],
  ['he-letter-qof', 'he-letter-kaf'],
];

/** The ideas of the letters a reader mistakes `id` for. */
export const hebrewLookAlikesOf = (id: string): string[] => HEBREW_LOOK_ALIKES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));

/**
 * Words of Genesis 1 and Jonah 1, in the form a card shows them, that between them hold every letter: a drill's words where the goal's chapters have none (a Greek goal, or one
 * that is not in the Hebrew yet), so a letter is always asked in a word. tests/unit/hebrew-letters.test.ts reads each against public/data and checks the 22 letters are held.
 */
export const HEBREW_DRILL_WORDS: readonly string[] = [
  'אוֹר', 'בָּרָא', 'גָּדוֹל', 'דָּג', 'הָיְתָה', 'וָבֹהוּ', 'זֶרַע', 'חַיָּה', 'טוֹב', 'יוֹם', 'כָּל', 'לָיְלָה', 'מַיִם', 'נֶפֶשׁ', 'סַעַר', 'עֵץ', 'פְּרִי', 'בְּצַלְמֵנוּ', 'קָרָא',
  'רָקִיעַ', 'שָׁמָיִם', 'תְהוֹם',
];

/** Whether Drill it can walk the Hebrew idea: each of the 22 letters (the alphabet has the letter drill, and the other Hebrew ideas have no drill yet; story l owns it). */
export const isHebrewDrillable = (ideaId: string): boolean => hebrewLetterOf(ideaId) !== undefined;
