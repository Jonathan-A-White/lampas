// src/resources/resourcesForLevel.ts — the one selector of what the 'How much Greek?' dial shows of a list of study resources, works or grammar books
// (mw-5r3p30.710, PROVISIONAL: the Mayor's cheap choice, the Governor to confirm). Every lister goes through it; none filters or orders a resource list on its own.
// Just English (0) hides the Greek (and Hebrew) ones; the steps between (1 to 4) put the English and 'both' ones first, then the Greek, each side in its own order; All in (5) is the list unchanged.
// A 'both' entry (an app that opens Greek and English: Logos) counts as English. Hiding is of the list only: a switch or tick he kept stays kept (nothing is deleted).
import { GREEK_TOP, type GreekLevel } from '../settings/definitions/greekInterest';
import type { ResourceLang } from './types';

const langOfEntry = (entry: { lang: ResourceLang }): ResourceLang => entry.lang;

/** A resource in the language of the source text, Greek or (a Hebrew lexicon, mw-5vvlay.2) Hebrew: the dial hides these at Just English and lists them after the English ones. */
const isSource = (lang: ResourceLang): boolean => lang === 'grc' || lang === 'he';

/** What to show of `list` at the dial's step `level`. `langOf` names an entry's language when the entries do not carry `lang` themselves (Settings' rows). */
export function resourcesForLevel<T extends { lang: ResourceLang }>(list: readonly T[], level?: GreekLevel): T[];
export function resourcesForLevel<T>(list: readonly T[], level: GreekLevel | undefined, langOf: (entry: T) => ResourceLang): T[];
export function resourcesForLevel<T>(list: readonly T[], level: GreekLevel = GREEK_TOP, langOf: (entry: T) => ResourceLang = langOfEntry as (entry: T) => ResourceLang): T[] {
  if (level >= GREEK_TOP) return [...list];
  const english = list.filter((entry) => !isSource(langOf(entry)));
  if (level <= 0) return english;
  return [...english, ...list.filter((entry) => isSource(langOf(entry)))];
}
