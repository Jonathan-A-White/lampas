// src/memorize/languages.ts — the languages a verse can be memorized in, from the dial of the verse's own language (his Q2, mw-fu7dqf.4; Hebrew mw-gdcyf98.15): English always; the verse's
// source language (Greek for the New Testament, Hebrew for the Old) from Curious; the Weave from Dipping a toe, where the Weave exists. At 'Just English' only English is offered, and nothing
// else is named. 'el' is never offered on an Old Testament verse nor 'he' on a New Testament one.
import { GREEK_VIEW_FROM, GREEK_WEAVE_FROM } from '../settings/definitions/greekInterest';
import { levelOf, type InterestLang, type InterestLevels } from '../settings/definitions/interest';

export type MemorizeLang = 'en' | 'el' | 'he' | 'weave';

/** Every language, in the order they are offered and listed. */
export const MEMORIZE_LANGS: readonly MemorizeLang[] = ['en', 'el', 'he', 'weave'];

/** The language a verse's own words are in, as a memorize language: Greek for a New Testament verse ('grc'), Hebrew for an Old Testament one ('hbo'). */
export const sourceLangOf = (source: InterestLang): 'el' | 'he' => (source === 'hbo' ? 'he' : 'el');

/** The languages offered for a verse of `source` ('grc' New Testament, 'hbo' Old Testament) at these dials: only the dial of that verse's language counts. English is the default when a verse enters; he chooses more per verse. */
export function languagesFor(levels: InterestLevels, source: InterestLang = 'grc'): MemorizeLang[] {
  const level = levelOf(source, levels);
  const own = sourceLangOf(source);
  return MEMORIZE_LANGS.filter((lang) => (lang === 'en' ? true : lang === 'weave' ? level >= GREEK_WEAVE_FROM : lang === own && level >= GREEK_VIEW_FROM));
}

const NAMES: Record<MemorizeLang, string> = { en: 'English', el: 'Greek', he: 'Hebrew', weave: 'Weave' };

/** What the screen calls a language. */
export const langName = (lang: MemorizeLang): string => NAMES[lang];

/** Whether a string is one of the languages. */
export const isMemorizeLang = (s: string): s is MemorizeLang => (MEMORIZE_LANGS as readonly string[]).includes(s);
