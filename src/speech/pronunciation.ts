// src/speech/pronunciation.ts — how the Greek is spoken and respelled, as a registry so another way (such as Erasmian)
// is one more file in ./schemes/ plus one line in SCHEMES below; nothing else names 'modern'. Modern Greek is the only
// scheme for now. docs/pronunciation.md says how to add one.
import { MODERN } from './schemes/modern';

/** The id of a scheme in the registry. */
export type GreekPronunciation = string;

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
