// How much Hebrew (Settings home, under 'Which languages?', mw-gdcyf98.2): the Greek dial's twin, 0 to 5 with the same six steps (src/settings/definitions/interest.ts).
// A phone not yet placed reads 0 (no Hebrew) until placeInterest has chosen a level.
import { interestFrom, interestLevelOf, interestSetting, levelsOf, INTEREST_TOP, type InterestLevel, type InterestStep } from './interest';

export type HebrewLevel = InterestLevel;
export type HebrewStep = InterestStep;

/** The six steps of the Hebrew dial, lowest first. */
export const HEBREW_LEVELS: readonly HebrewStep[] = levelsOf('hbo');

/** The highest step: All in. */
export const HEBREW_TOP: HebrewLevel = INTEREST_TOP;

export const hebrewLevelOf = (raw: unknown): HebrewLevel => interestLevelOf('hbo', raw);

/** The dependency of a row that the Hebrew dial shows from step `level` up. */
export const hebrewFrom = (level: HebrewLevel) => interestFrom('hbo', level);

export const hebrewInterestSetting = interestSetting('hbo');
