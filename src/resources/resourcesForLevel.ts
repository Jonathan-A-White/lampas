// src/resources/resourcesForLevel.ts — the one selector of what the language dials show of a list of study resources, works or grammar books
// (mw-5r3p30.710, PROVISIONAL: the Mayor's cheap choice, the Governor to confirm). Every lister goes through it; none filters or orders a resource list on its own.
// A Greek ('grc') entry is hidden at Greek 0 and a Hebrew ('he') one at Hebrew 0 (mw-gdcyf98.3); while a dial that shows source entries stands between 1 and 4 the English and 'both'
// ones come first, then the Greek and Hebrew ones, each side in its own order; with every dial that shows any at All in (5) the list is unchanged.
// A 'both' entry (an app that opens Greek and English: Logos) counts as English. Hiding is of the list only: a switch or tick he kept stays kept (nothing is deleted).
import { latestSetting } from '../events/bus';
import { GREEK_TOP, type GreekLevel } from '../settings/definitions/greekInterest';
import { hebrewLevelOf } from '../settings/definitions/hebrewInterest';
import type { InterestLevels } from '../settings/definitions/interest';
import type { ResourceLang } from './types';

const langOfEntry = (entry: { lang: ResourceLang }): ResourceLang => entry.lang;

/** A resource in the language of the source text, Greek or (a Hebrew lexicon, mw-5vvlay.2) Hebrew: its dial hides these at Just English and lists them after the English ones. */
const isSource = (lang: ResourceLang): boolean => lang === 'grc' || lang === 'he';

/** The Hebrew dial as the bus last told it (the app tells it at its start and at every move), else `fallback`: how a caller that passes only the Greek step still hides a Hebrew entry at Hebrew 0. */
const toldHebrew = (fallback: GreekLevel): GreekLevel => {
  const told = latestSetting('hebrewInterest');
  return told ? hebrewLevelOf(told.value) : fallback;
};

/** What to show of `list`. `level` is the Greek step (All in when absent); `langOf` names an entry's language when the entries do not carry `lang` themselves (Settings' rows);
 *  `levels` are both dials' steps (mw-gdcyf98.3) and, when absent, are the Greek `level` and the Hebrew dial as the bus last told it. */
export function resourcesForLevel<T extends { lang: ResourceLang }>(list: readonly T[], level?: GreekLevel, langOf?: undefined, levels?: InterestLevels): T[];
export function resourcesForLevel<T>(list: readonly T[], level: GreekLevel | undefined, langOf: (entry: T) => ResourceLang, levels?: InterestLevels): T[];
export function resourcesForLevel<T>(
  list: readonly T[],
  level: GreekLevel = GREEK_TOP,
  langOf: ((entry: T) => ResourceLang) | undefined = langOfEntry as (entry: T) => ResourceLang,
  levels: InterestLevels = { grc: level, he: toldHebrew(level) },
): T[] {
  const of = langOf ?? (langOfEntry as (entry: T) => ResourceLang);
  const dialOf = (entry: T): GreekLevel => (of(entry) === 'he' ? levels.he : levels.grc);
  const shown = list.filter((entry) => !isSource(of(entry)) || dialOf(entry) > 0);
  // the English ones lead while a dial that shows source entries stands between 1 and 4; with every such dial at All in the list is as it came
  const sources = shown.filter((entry) => isSource(of(entry)));
  if (sources.every((entry) => dialOf(entry) >= GREEK_TOP)) return shown;
  return [...shown.filter((entry) => !isSource(of(entry))), ...sources];
}
