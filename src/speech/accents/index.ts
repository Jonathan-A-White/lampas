// src/speech/accents/index.ts — the English accents the sound hints are said in (mw-5r3p30.352, his words: "build for American ... build it in a
// modular way so that somebody could choose British"): one table per accent (american.ts, british.ts), keyed by the standard sound ids of ../sounds.ts,
// and the ONE accessor that turns a Greek pronunciation's sound into words: soundWords(scheme, accent). Nothing outside this folder keys a sound to an
// English word (tests/unit/one-english-accent.test.ts scans for it); a third accent is one more table plus a line in ACCENTS.
import type { Pronunciation } from '../pronunciation';
import type { SoundId } from '../sounds';
import { AMERICAN } from './american';
import { BRITISH } from './british';
import { IPA } from './ipa';
import type { EnglishAccent, SoundHint } from './types';

export type { EnglishAccent, SoundHint } from './types';

/** Every accent, in the order a choice of them will list them. */
export const ACCENTS: readonly EnglishAccent[] = [AMERICAN, BRITISH, IPA];

export const DEFAULT_ACCENT = AMERICAN.id;

/** The accent `id` names; the default's when it names none. */
export const accentOf = (id: unknown): EnglishAccent => ACCENTS.find((a) => a.id === id) ?? AMERICAN;

let chosen: string = DEFAULT_ACCENT;

/** The accent the hints are said in now. American until a choice is made (Settings > English accent: src/settings/definitions/englishAccent.ts). */
export const chosenAccent = (): EnglishAccent => accentOf(chosen);

const listeners = new Set<() => void>();

/** Calls `listener` after each change of the chosen accent; returns the unsubscribe (for useSyncExternalStore: src/speech/accents/useAccent.ts). */
export function onAccentChosen(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Says every hint in `id`'s accent from now on. */
export function chooseAccent(id: string): void {
  const next = accentOf(id).id;
  if (next === chosen) return;
  chosen = next;
  listeners.forEach((listener) => listener());
}

/** How a sound of a Greek pronunciation is said to this reader, by the symbol its respelling writes for it ('o', 'kh'). */
export interface SoundWords {
  /** as a sound of its own, the key word quoted: 'o, as in “or”, short', 'dh, the th of “this”' */
  keyed(symbol: string): string;
  /** as one choice of a quiz (mw-5r3p30.355): the symbol and the short hint only, never an aside or a rule: 'kh, as in “chutzpah”', 'r, a quick tap of the tongue' */
  choice(symbol: string): string;
  /** inside a sentence: 'o as in or, short', 'e as in pet' */
  asIn(symbol: string): string;
  /** how the hints are given, to finish 'the vowels, each ...' in a guide */
  hintedBy: string;
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
    hintedBy: accent.hintedBy,
    keyed: (symbol) => {
      const { word, note } = hint(symbol);
      return word ? `${symbol}, as in “${word}”${after(note)}` : `${symbol}${after(note)}`;
    },
    choice: (symbol) => {
      const { word, note, choice } = hint(symbol);
      return `${symbol}, ${choice ?? (word ? `as in “${word}”` : note)}`;
    },
    asIn: (symbol) => {
      const { word, note } = hint(symbol);
      return word ? `${symbol} as in ${word}${after(note)}` : `${symbol}${after(note)}`;
    },
  };
}
