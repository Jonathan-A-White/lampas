// src/speech/pronunciation.ts — how the Greek is spoken, as a list so another way (such as Erasmian) is one more
// entry here plus whatever it needs in the voice and the reading check; nothing else names 'modern'. Modern Greek is
// the only entry for now: the phone's el-GR voice.

/** The ids of the entries below. */
export type GreekPronunciation = 'modern';

export interface Pronunciation {
  id: GreekPronunciation;
  /** what Settings shows */
  label: string;
  /** the language tag put on every utterance, and the language of the voices offered for it */
  lang: string;
  /** a line under the label in Settings */
  note: string;
}

export const PRONUNCIATIONS: readonly Pronunciation[] = [
  { id: 'modern', label: 'Modern Greek', lang: 'el-GR', note: "How Greek is spoken today, by the phone's Greek voice." },
];

export const DEFAULT_PRONUNCIATION: GreekPronunciation = 'modern';

export function isPronunciation(value: unknown): value is GreekPronunciation {
  return PRONUNCIATIONS.some((p) => p.id === value);
}

/** The entry for `id`; the default's when it is not one (a saved value from a later version). */
export function pronunciationOf(id: unknown): Pronunciation {
  return PRONUNCIATIONS.find((p) => p.id === id) ?? PRONUNCIATIONS.find((p) => p.id === DEFAULT_PRONUNCIATION)!;
}
