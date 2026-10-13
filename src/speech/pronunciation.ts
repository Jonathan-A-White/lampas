// src/speech/pronunciation.ts — how the Greek is spoken and respelled, as a registry so another way (such as Erasmian)
// is one more file in ./schemes/ plus one line in SCHEMES below; nothing else names 'modern'. Modern Greek is the only
// scheme for now. docs/pronunciation.md says how to add one.
import { MODERN } from './schemes/modern';

/** The id of a scheme in the registry. */
export type GreekPronunciation = string;

/** What a scheme teaches of one sound-bearing ladder idea (a letter, a vowel pair, a consonant pair, a breathing or one of the groups): `sound` is
 * how the idea sounds in this scheme, asked by the questions ('v, as in “vase”'); `text` is the whole lesson. Either may be left out: with a `sound`
 * and no `text` the lesson is the idea's spelling facts plus 'In <label> it sounds like <sound>.' (src/data/grammar/lessons.ts). */
export interface SoundLesson {
  text?: string;
  sound?: string;
}

export interface Pronunciation {
  id: GreekPronunciation;
  /** what Settings shows */
  label: string;
  /** the language tag put on every utterance, and the language of the voices offered for it */
  lang: string;
  /** the language the mill scores a reading of the Greek in (a grind's scoring.langs): modern Greek is 'el' */
  scoringLang: string;
  /** a line under the label in Settings */
  note: string;
  /** the Greek word as syllables an English reader can say, the stressed one in capitals: 'χριστῷ' is 'hree-STO' */
  respell(greekWord: string): string;
  /** An English word that has each sound the respelling writes ('e' is the e of 'pet'): the lessons give every sound with its key word, so another scheme changes them */
  keyWords: Readonly<Record<string, string>>;
  /** What this scheme's voice is handed for a Greek word of ONE letter (ὁ, ἡ, ὦ, Ὃ), so that it says the word's sound: a voice handed a bare
   * letter names it ('omicron'). Modern Greek gives the stressed vowel ('ό'); mw-5r3p30.262. */
  loneLetter(word: string): string;
  /** The sound lessons this scheme teaches, keyed by ladder idea id ('letter-beta', 'diphthong-ou', 'breathings' ...), in its own sounds: the idea sheet and the
   * sound questions read them (mw-5r3p30.229). An idea it gives none for falls back to a text that names no sound, never to another scheme's. */
  lessons?: Readonly<Record<string, SoundLesson>>;
}

const SCHEMES: Pronunciation[] = [MODERN];

/** Every scheme, in the order Settings lists them. Read it at use, not at load: registerPronunciation adds to it. */
export const PRONUNCIATIONS: readonly Pronunciation[] = SCHEMES;

export const DEFAULT_PRONUNCIATION: GreekPronunciation = MODERN.id;

/** Adds a scheme at the end of the list (tests do, to prove the list drives Settings and the word sheet); returns the
 * function that takes it out again. */
export function registerPronunciation(scheme: Pronunciation): () => void {
  SCHEMES.push(scheme);
  return () => {
    const at = SCHEMES.indexOf(scheme);
    if (at >= 0) SCHEMES.splice(at, 1);
  };
}

export function isPronunciation(value: unknown): value is GreekPronunciation {
  return PRONUNCIATIONS.some((p) => p.id === value);
}

/** The entry for `id`; the default's when it is not one (a saved value from a later version). */
export function pronunciationOf(id: unknown): Pronunciation {
  return PRONUNCIATIONS.find((p) => p.id === id) ?? PRONUNCIATIONS.find((p) => p.id === DEFAULT_PRONUNCIATION)!;
}
