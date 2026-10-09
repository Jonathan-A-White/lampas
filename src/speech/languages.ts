// src/speech/languages.ts — the languages the app speaks, as a list, and the speed each is spoken at. A new language
// (Latin, say) is one more id here and one more entry in LANGUAGES: it gets its own voice and its own speed in the
// settings store, on the bus and in Settings by the same code, and nothing else names 'english' or 'greek' as a list.

/** The ids of the entries below: the languages that have a voice and a speed of their own in Settings. */
export type SettableLanguage = 'english' | 'greek';

/** Every language the app can speak. Hebrew (mw-5r3p30.98) is said in the phone's he-IL voice at the normal speed; it has no voice or speed setting yet. */
export type SpeechLanguage = SettableLanguage | 'hebrew';

/** The language tag of spoken Hebrew: modern Israeli. */
export const HEBREW_LANG = 'he-IL';

export interface SpeechLanguageInfo {
  id: SettableLanguage;
  /** what Settings calls it: 'English voice', 'Greek speed' */
  label: string;
  /** the language tag put on an utterance when nothing else says (Greek's comes from its pronunciation) */
  lang: string;
}

export const LANGUAGES: readonly SpeechLanguageInfo[] = [
  { id: 'english', label: 'English', lang: 'en-US' },
  { id: 'greek', label: 'Greek', lang: 'el-GR' },
];

/** The speed of each language: 1 is the engine's normal. */
export type SpeechRates = Record<SettableLanguage, number>;

export const RATE_MIN = 0.5;
export const RATE_MAX = 1.5;
export const RATE_STEP = 0.1;
export const DEFAULT_RATE = 1;

export const DEFAULT_RATES: SpeechRates = Object.fromEntries(LANGUAGES.map((l) => [l.id, DEFAULT_RATE])) as SpeechRates;

/** A speed within the range, to two places (a slider's 0.7 must stay 0.7); the default when it is not a number. */
export function normaliseRate(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_RATE;
  return Math.round(Math.min(RATE_MAX, Math.max(RATE_MIN, n)) * 100) / 100;
}
