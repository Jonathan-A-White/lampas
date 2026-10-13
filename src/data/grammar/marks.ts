// src/data/grammar/marks.ts — the pairs of words a breathing or an accent tells apart, and the small words that lean on the one before (mw-86e9r1.6,
// PROVISIONAL, docs/grammar.md). Pure data. Every phrase is a real New Testament one, checked against public/data by tests/unit/marks-change-word.test.ts.
// ladder.ts teaches them as 'Marks that change the word' and 'Enclitics'; questions.ts asks them, offering the twin of the right word, so a reader
// who ignores the mark misses.
import type { VerseRef } from './prepositions';

const NT = (book: string, chapter: number, verse: number): VerseRef => ({ book, chapter, verse });

/** One word of a pair, shown in a phrase of the text. */
export interface MarkWord {
  /** The word as the lesson lists it (NFC): 'ἤ'. */
  word: string;
  /** The phrase as the text has it, the word included, spelt as in the verse ('ἢ τοὺς προφήτας': a grave accent is an acute before another word). */
  phrase: string;
  /** The word as the phrase spells it. */
  inPhrase: string;
  /** What the phrase means in its verse. */
  gloss: string;
  ref: VerseRef;
  /** Two wrong choices besides the twin: other words that do not fit the phrase and are not alike but for their marks. */
  decoys: [string, string];
}

/** Two words spelt alike but for a breathing or an accent. */
export interface MarkPair {
  a: MarkWord;
  b: MarkWord;
}

export const MARK_PAIRS: readonly MarkPair[] = [
  {
    a: { word: 'ἡ', inPhrase: 'ἡ', phrase: 'ἡ ζωὴ ἦν τὸ φῶς', gloss: 'the life was the light', ref: NT('jhn', 1, 4), decoys: ['ὁ', 'ἦν'] },
    b: { word: 'ἤ', inPhrase: 'ἢ', phrase: 'ἢ τοὺς προφήτας', gloss: 'or the prophets', ref: NT('mat', 5, 17), decoys: ['ὁ', 'ἦν'] },
  },
  {
    a: { word: 'ὁ', inPhrase: 'ὁ', phrase: 'ὁ πατήρ μου', gloss: 'my Father', ref: NT('jhn', 14, 23), decoys: ['ἡ', 'τό'] },
    b: { word: 'ὅ', inPhrase: 'ὃ', phrase: 'ὃ γέγονεν', gloss: 'what has come to be', ref: NT('jhn', 1, 3), decoys: ['ἡ', 'τό'] },
  },
  {
    a: { word: 'εἰ', inPhrase: 'εἰ', phrase: 'εἰ σὺ οὐκ εἶ ὁ χριστός', gloss: 'if you are not the Christ', ref: NT('jhn', 1, 25), decoys: ['ἦν', 'οὐ'] },
    b: { word: 'εἶ', inPhrase: 'εἶ', phrase: 'σὺ εἶ ὁ υἱὸς τοῦ θεοῦ', gloss: 'you are the Son of God', ref: NT('jhn', 1, 49), decoys: ['ἦν', 'ἐστιν'] },
  },
  {
    a: { word: 'ἐν', inPhrase: 'ἐν', phrase: 'ἐν ἀρχῇ', gloss: 'in the beginning', ref: NT('jhn', 1, 2), decoys: ['ἐκ', 'εἰς'] },
    b: { word: 'ἕν', inPhrase: 'ἕν', phrase: 'ἕν ἐσμεν', gloss: 'we are one', ref: NT('jhn', 10, 30), decoys: ['ἐκ', 'εἰς'] },
  },
  {
    a: { word: 'οὐ', inPhrase: 'οὐ', phrase: 'οὐ κατέλαβεν', gloss: 'did not overcome it', ref: NT('jhn', 1, 5), decoys: ['ὧν', 'ἡ'] },
    b: { word: 'οὗ', inPhrase: 'οὗ', phrase: 'οὗ οὐκ εἰμὶ ἱκανὸς', gloss: 'of whom I am not worthy', ref: NT('mrk', 1, 7), decoys: ['ὧν', 'ἡ'] },
  },
  {
    a: { word: 'ἀλλά', inPhrase: 'ἀλλὰ', phrase: 'ἀλλὰ πληρῶσαι', gloss: 'but to fulfil', ref: NT('mat', 5, 17), decoys: ['ἄλλος', 'ἄλλῳ'] },
    b: { word: 'ἄλλα', inPhrase: 'ἄλλα', phrase: 'ἄλλα πολλὰ', gloss: 'many other things', ref: NT('jhn', 21, 25), decoys: ['ἄλλος', 'ἄλλῳ'] },
  },
  {
    a: { word: 'αὐτή', inPhrase: 'αὐτὴ', phrase: 'αὐτὴ ἡ φύσις', gloss: 'nature itself', ref: NT('1co', 11, 14), decoys: ['αὐτούς', 'αὐτῆς'] },
    b: { word: 'αὕτη', inPhrase: 'αὕτη', phrase: 'αὕτη ἐστὶν ἡ μαρτυρία', gloss: 'this is the testimony', ref: NT('1jn', 5, 9), decoys: ['αὐτούς', 'οὗτος'] },
  },
  {
    a: { word: 'τίς', inPhrase: 'τίς', phrase: 'σὺ τίς εἶ', gloss: 'who are you?', ref: NT('rom', 9, 20), decoys: ['τί', 'τινί'] },
    b: { word: 'τις', inPhrase: 'τις', phrase: 'ἄνθρωπός τις', gloss: 'a certain man', ref: NT('luk', 14, 2), decoys: ['τί', 'τινί'] },
  },
];

/** A small word that leans on the one before it, or the question word it is not, shown in a phrase of the text. */
export interface EncliticUse {
  /** The word to pick (NFC), as the phrase spells it. */
  right: string;
  /** Three wrong choices, the right word's twin first when it has one. */
  others: [string, string, string];
  phrase: string;
  gloss: string;
  ref: VerseRef;
}

export const ENCLITIC_USES: readonly EncliticUse[] = [
  { right: 'τις', others: ['τίς', 'τίνα', 'τινί'], phrase: 'ἄνθρωπός τις', gloss: 'a certain man', ref: NT('luk', 14, 2) },
  { right: 'τίς', others: ['τις', 'τίνα', 'τινί'], phrase: 'σὺ τίς εἶ', gloss: 'who are you?', ref: NT('rom', 9, 20) },
  { right: 'ἐσμεν', others: ['ἐστε', 'εἰσιν', 'ἐστιν'], phrase: 'ἕν ἐσμεν', gloss: 'we are one', ref: NT('jhn', 10, 30) },
  { right: 'μου', others: ['σου', 'ἡμῶν', 'ἐμοῦ'], phrase: 'ὁ πατήρ μου', gloss: 'my Father', ref: NT('jhn', 14, 23) },
];

/** A phrase with `word` (its first occurrence) blanked: 'ἄνθρωπός ___'. */
export function blankWord(phrase: string, word: string): string {
  const parts = phrase.split(' ');
  const at = parts.indexOf(word);
  if (at < 0) throw new Error(`${JSON.stringify(word)} is not in ${JSON.stringify(phrase)}`);
  parts[at] = '___';
  return parts.join(' ');
}
