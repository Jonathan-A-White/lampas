// src/services/interestField.ts — a language dial as a request carries it (mw-3ased2.3, mw-gdcyf98.3): `greek_interest` and `hebrew_interest`, each the step, its name and the one step above it
// (the only step the tutor may offer to raise the dial to). The Bible talk sends both; so does an ask on a verse. The language of the chapter he is in picks which one an offer may name.
import { GREEK_LEVELS, greekLevelOf, nextGreekStep } from '../settings/definitions/greekInterest';
import { HEBREW_LEVELS, hebrewLevelOf } from '../settings/definitions/hebrewInterest';
import { higherOf, type InterestLevel } from '../settings/definitions/interest';
import type { SettingValue } from '../settings/define';

/** A dial as the request carries it: `level` and its `name`, and `next`, the step above it, missing at All in. */
export interface InterestField {
  level: InterestLevel;
  name: string;
  next?: { level: InterestLevel; name: string };
}

/** The Greek dial's field, from the settings a request carries: `greekInterest`, read as the Reader reads it (All in until the phone is placed). */
export function greekInterestField(settings: Record<string, SettingValue>): InterestField {
  const level = greekLevelOf(settings.greekInterest);
  const next = nextGreekStep(level);
  return { level, name: GREEK_LEVELS[level].name, ...(next ? { next: { level: next.level, name: next.name } } : {}) };
}

/** The Hebrew dial's field, the same shape: `hebrewInterest` of the settings (Just English until the phone is placed). */
export function hebrewInterestField(settings: Record<string, SettingValue>): InterestField {
  const level = hebrewLevelOf(settings.hebrewInterest);
  const next = HEBREW_LEVELS[level + 1];
  return { level, name: HEBREW_LEVELS[level].name, ...(next ? { next: { level: next.level, name: next.name } } : {}) };
}

/** The higher of the two dials, from the settings a request carries: what his Logos works and the tutor's resources are shown at (the Greek ones need Greek, the Hebrew ones Hebrew; a shelf both languages share follows the higher). */
export const higherInterest = (settings: Record<string, SettingValue>): InterestLevel => higherOf({ grc: greekLevelOf(settings.greekInterest), he: hebrewLevelOf(settings.hebrewInterest) });
