// src/speech/accents/index.ts — the English accents the sound hints are said in (mw-5r3p30.352, his words: "build for American ... build it in a
// modular way so that somebody could choose British"): one table per accent (american.ts, british.ts), keyed by the standard sound ids of ../sounds.ts,
// and the ONE accessor that turns a Greek pronunciation's sound into words: soundWords(scheme, accent). Nothing outside this folder keys a sound to an
// English word (tests/unit/one-english-accent.test.ts scans for it); a third accent is one more table plus a line in ACCENTS.
import type { Pronunciation } from '../pronunciation';
import type { SoundId } from '../sounds';
import { AMERICAN } from './american';
import { BRITISH } from './british';
import type { EnglishAccent, SoundHint } from './types';

export type { EnglishAccent, SoundHint } from './types';

/** Every accent, in the order a choice of them will list them. */
export const ACCENTS: readonly EnglishAccent[] = [AMERICAN, BRITISH];

export const DEFAULT_ACCENT = AMERICAN.id;

/** The accent `id` names; the default's when it names none. */
export const accentOf = (id: unknown): EnglishAccent => ACCENTS.find((a) => a.id === id) ?? AMERICAN;

let chosen: string = DEFAULT_ACCENT;

/** The accent the hints are said in now. American until a choice is made (the Settings choice is mw-5r3p30.353). */
export const chosenAccent = (): EnglishAccent => accentOf(chosen);

/** Says every hint in `id`'s accent from now on. */
export function chooseAccent(id: string): void {
  chosen = accentOf(id).id;
}

/** How a sound of a Greek pronunciation is said to this reader, by the symbol its respelling writes for it ('o', 'kh'). */
export interface SoundWords {
  /** as a sound of its own, the key word quoted: 'o, as in “or”, short', 'dh, the th of “this”' */
  keyed(symbol: string): string;
  /** inside a sentence: 'o as in or, short', 'e as in pet' */
  asIn(symbol: string): string;
}

/** The standard sounds `scheme` writes that `accent` has no hint for (none, for a table that is whole). */
export function missingHints(scheme: Pronunciation, accent: EnglishAccent): SoundId[] {
  return [...new Set(Object.values(scheme.sounds))].filter((id) => !accent.hints[id]);
}

/** The words `scheme`'s sounds are said in for a reader of `accent` (the chosen one when none is named): its symbol for the sound, then the accent's hint. */
export function soundWords(scheme: Pronunciation, accent: EnglishAccent = chosenAccent()): SoundWords {
  const hint = (symbol: string): SoundHint => {
    const id = scheme.sounds[symbol];
    if (!id) throw new Error(`${scheme.label} writes no sound ${JSON.stringify(symbol)}`);
    const found = accent.hints[id];
    if (!found) throw new Error(`${accent.label} English has no hint for ${id}`);
    return found;
  };
  const after = (note: string | undefined): string => (note ? `, ${note}` : '');
  return {
    keyed: (symbol) => {
      const { word, note } = hint(symbol);
      return word ? `${symbol}, as in “${word}”${after(note)}` : `${symbol}${after(note)}`;
    },
    asIn: (symbol) => {
      const { word, note } = hint(symbol);
      return word ? `${symbol} as in ${word}${after(note)}` : `${symbol}${after(note)}`;
    },
  };
}
