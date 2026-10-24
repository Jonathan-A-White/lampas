// src/memorize/languages.ts — the languages a verse can be memorized in, from the Greek dial (his Q2, mw-fu7dqf.4): English always; Greek from Curious; the Weave from
// Dipping a toe, where the Weave exists. At 'Just English' only English is offered, and nothing else is named.
import { GREEK_VIEW_FROM, GREEK_WEAVE_FROM, type GreekLevel } from '../settings/definitions/greekInterest';

export type MemorizeLang = 'en' | 'el' | 'weave';

/** Every language, in the order they are offered and listed. */
export const MEMORIZE_LANGS: readonly MemorizeLang[] = ['en', 'el', 'weave'];

/** The languages offered at this Greek level. English is the default when a verse enters; he chooses more per verse. */
export function languagesFor(level: GreekLevel): MemorizeLang[] {
  return MEMORIZE_LANGS.filter((lang) => (lang === 'en' ? true : lang === 'el' ? level >= GREEK_VIEW_FROM : level >= GREEK_WEAVE_FROM));
}

const NAMES: Record<MemorizeLang, string> = { en: 'English', el: 'Greek', weave: 'Weave' };

/** What the screen calls a language. */
export const langName = (lang: MemorizeLang): string => NAMES[lang];

/** Whether a string is one of the languages. */
export const isMemorizeLang = (s: string): s is MemorizeLang => (MEMORIZE_LANGS as readonly string[]).includes(s);
