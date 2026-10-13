// src/data/grammar/soundAlike.ts — three pairs of different words that Modern Greek says alike (mw-86e9r1.7, PROVISIONAL, docs/grammar.md): ἡμεῖς “we” and
// ὑμεῖς “you” (η and υ), λύομεν “we loose” and λύωμεν “let us loose” (ο and ω), λύει “he looses” and λύῃ “he may loose” (ει and ῃ). Pure data.
// ladder.ts teaches them as 'Words that sound alike' (the sound claim is the scheme's own lesson, schemes/modernLessons.ts); questions.ts asks them.
// The model verb is λύω, as in a grammar; the New Testament has the same endings on ἔχω, so each word carries one such form with its place.
import type { VerseRef } from './prepositions';

const NT = (book: string, chapter: number, verse: number): VerseRef => ({ book, chapter, verse });

/** A word of a pair: the word, what it means, and a form of the text that has the same ending (the word itself where the text has it). */
export interface SoundAlikeWord {
  word: string;
  gloss: string;
  nt: { word: string; ref: VerseRef };
}

export interface SoundAlikePair {
  a: SoundAlikeWord;
  b: SoundAlikeWord;
  /** The letters that tell them apart, for the lesson: 'η and υ'. */
  letters: string;
}

export const SOUND_ALIKE: readonly SoundAlikePair[] = [
  {
    a: { word: 'ἡμεῖς', gloss: 'we', nt: { word: 'ἡμεῖς', ref: NT('1co', 12, 13) } },
    b: { word: 'ὑμεῖς', gloss: 'you', nt: { word: 'ὑμεῖς', ref: NT('1co', 1, 30) } },
    letters: 'η and υ',
  },
  {
    a: { word: 'λύομεν', gloss: 'we loose', nt: { word: 'ἔχομεν', ref: NT('1co', 2, 16) } },
    b: { word: 'λύωμεν', gloss: 'let us loose', nt: { word: 'ἔχωμεν', ref: NT('1jn', 4, 17) } },
    letters: 'ο and ω',
  },
  {
    a: { word: 'λύει', gloss: 'he looses', nt: { word: 'ἔχει', ref: NT('1co', 12, 12) } },
    b: { word: 'λύῃ', gloss: 'he may loose', nt: { word: 'ἔχῃ', ref: NT('1jn', 3, 17) } },
    letters: 'ει and ῃ',
  },
];
