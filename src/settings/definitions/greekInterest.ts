// How much Greek (Settings home, the dial under 'Which languages?', mw-3ased2.2): 0 to 5, each step a real change; the dial itself is src/settings/definitions/interest.ts. The level decides which Greek settings and views are
// shown, by the ordinary dependsOn rule (a row says `dependsOn: greekFrom(n)`: shown from step n up), and the Reader reads it too (viewAt, weaveAt,
// newWordsAt: what is hidden does not act). Moving the dial is src/data/repositories/greekInterest.ts. The names and lines are the Mayor's, PROVISIONAL until the
// Governor confirms them (the epic mw-3ased2). A phone that has not been placed yet reads 5, All in: nothing is hidden until placeGreekInterest has chosen a level.
import type { Weave } from './weave';
import { INTEREST_TOP, interestFrom, interestLevelOf, interestSetting, levelsOf, type InterestLevel, type InterestStep } from './interest';

export type GreekLevel = InterestLevel;
export type GreekStep = InterestStep;

/** The six steps of the dial, lowest first. */
export const GREEK_LEVELS: readonly GreekStep[] = levelsOf('grc');

/** The step one above `level`, or undefined at the top: what the tutor offers to raise the dial to. */
export const nextGreekStep = (level: GreekLevel): GreekStep | undefined => GREEK_LEVELS[level + 1];

/** The highest step: All in. A phone not yet placed reads it, so nothing is hidden. */
export const GREEK_TOP: GreekLevel = INTEREST_TOP;

export const greekLevelOf = (raw: unknown): GreekLevel => interestLevelOf('grc', raw);

/** The dependency of a row that the dial shows from step `level` up (as text, like every dependency: the setting's value). */
export const greekFrom = (level: GreekLevel) => interestFrom('grc', level);

/** The least step that shows the Reader's English | Greek view and a word's sheet (Curious). */
export const GREEK_VIEW_FROM: GreekLevel = 1;
/** The least step that shows the Weave (Dipping a toe). */
export const GREEK_WEAVE_FROM: GreekLevel = 2;
/** The least step that offers new words a day (Learning). */
export const GREEK_WORDS_FROM: GreekLevel = 3;

/** The view the Reader draws at a step: the Greek view only from Curious up. */
export const viewAt = <V extends string>(level: GreekLevel, view: V): V | 'english' => (level >= GREEK_VIEW_FROM ? view : 'english');
/** The Weave the Reader weaves at a step: none below Dipping a toe. */
export const weaveAt = (level: GreekLevel, weave: Weave): Weave => (level >= GREEK_WEAVE_FROM ? weave : 'off');
/** New words a day at a step: none below Learning. */
export const newWordsAt = (level: GreekLevel, perDay: number): number => (level >= GREEK_WORDS_FROM ? perDay : 0);

/** The step a phone is placed at by what its reader has: the Greek view means 4, new words a day above 0 means 3, the Weave on means 2, else 0. */
export function placementOf(has: { view: 'english' | 'greek'; newWords: number; weave: Weave }): GreekLevel {
  if (has.view === 'greek') return 4;
  if (has.newWords > 0) return 3;
  if (has.weave !== 'off') return 2;
  return 0;
}

export const greekInterestSetting = interestSetting('grc');
