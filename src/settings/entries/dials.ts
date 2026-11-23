// src/settings/entries/dials.ts — the registry entries of the Settings home's top rows: Which languages? and the two dials (SETTINGS slots 10 to 30, src/settings/entry.ts).
import { getGreekInterest, getHebrewInterest, setGreekInterest, setHebrewInterest, setLanguages } from '../../data/repositories';
import { greekInterestSetting, greekLevelOf } from '../definitions/greekInterest';
import { hebrewInterestSetting, hebrewLevelOf } from '../definitions/hebrewInterest';
import { LANGUAGES_CHOICES, languagesOf, type Languages } from '../definitions/interest';
import { fromDefinition, slotted, type SettingEntry } from '../entry';

/**
 * Which languages he reads (first row of the Settings home, mw-gdcyf98.2): the two dials' own state, not a setting of its own, so it has no store. Reading it answers
 * languagesOf the dials; writing it moves them (setLanguages): English only puts both at 0, Greek or Hebrew keeps that one and puts the other at 0, Both raises each dial
 * that stands at 0 to the level it was left at (else 1). The dials' rows are drawn only while their language is chosen.
 */
const languagesEntry: SettingEntry = {
  key: 'languages',
  section: 'dial',
  label: 'Which languages?',
  // PROVISIONAL (the Mayor's words, the Governor to confirm)
  hint: 'The Bible in English, or with its Greek, its Hebrew, or both',
  allowed: { kind: 'choice', values: LANGUAGES_CHOICES },
  read: async () => languagesOf(await getGreekInterest(), await getHebrewInterest()),
  write: (value) => setLanguages(String(value) as Languages),
  show: (value) => `Which languages?: ${LANGUAGES_CHOICES.find((c) => c.value === value)?.label ?? String(value)}`,
};

/** How much Greek (the dial at the top of the Settings home): writing it moves the dial, which brings in and turns off what the steps change (src/data/repositories/greekInterest.ts). */
const greekInterestEntry: SettingEntry = {
  ...fromDefinition(greekInterestSetting),
  write: (value) => setGreekInterest(greekLevelOf(value)),
};

/** How much Hebrew (under the Greek dial): the same, for the Hebrew dial. */
const hebrewInterestEntry: SettingEntry = {
  ...fromDefinition(hebrewInterestSetting),
  write: (value) => setHebrewInterest(hebrewLevelOf(value)),
};

export const languagesSlot = slotted(10, languagesEntry);
export const greekInterestSlot = slotted(20, greekInterestEntry);
export const hebrewInterestSlot = slotted(30, hebrewInterestEntry);
