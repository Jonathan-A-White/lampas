// features/steps/levels.ts — puts a phone at a Greek or Hebrew level in a feature step, with what the dial brings (mw-fnvjof.17.80). The step-side twin of tests/e2e/greek-start.ts putAtLevels.
// A bare greekInterest / hebrewInterest write skips what tapping the step also sets (the Weave Solid at 2, the Greek view at 4: BRINGS, src/data/repositories/greekBrings.ts), so the scenario
// would draw a screen he never sees. lint local/no-raw-interest-write refuses the bare write in a step; this file is the one place the dial's key is written, from broughtUpTo.
import { db } from '../../src/data/db';
import { broughtUpTo } from '../../src/data/repositories/greekBrings';
import type { GreekLevel } from '../../src/settings/definitions/greekInterest';

export type Level = GreekLevel;
export type Levels = { greek?: GreekLevel; hebrew?: GreekLevel };

/** The settings a phone holds once the dials stand at `levels` (a dial left out is not written): each dial's level and every starting value the steps up to the higher dial bring in
 * (the shared settings follow the higher dial, as the dial's own move has it). For a step that opens the app with `settings` / a saved-settings object. */
export function settingsAtLevels(levels: Levels): Record<string, string> {
  const dials: Record<string, string> = {};
  // a raw level: this helper is the one place the dial's key is written, together with what it brings
  if (levels.greek !== undefined) dials.greekInterest = String(levels.greek);
  // a raw level: this helper is the one place the dial's key is written, together with what it brings
  if (levels.hebrew !== undefined) dials.hebrewInterest = String(levels.hebrew);
  return { ...broughtUpTo(Math.max(levels.greek ?? 0, levels.hebrew ?? 0) as GreekLevel), ...dials };
}

/** The settings rows of settingsAtLevels. */
export const rowsAtLevels = (levels: Levels): { key: string; value: string }[] => Object.entries(settingsAtLevels(levels)).map(([key, value]) => ({ key, value }));

/** Writes the level(s) and what they bring into the settings store; `extra` are other settings written with them. The store must be open (and cleared first, if the scenario wants a fresh phone). */
export async function putAtLevels(levels: Levels, extra: Record<string, string> = {}): Promise<void> {
  await db.settings.bulkPut([...rowsAtLevels(levels), ...Object.entries(extra).map(([key, value]) => ({ key, value }))]);
}

/** The reader a scenario written for the English view starts from at a high level: the dial's climb to 4 puts the phone in the Greek view with the Weave Solid and its word order Greek (BRINGS), and
 * these are what a reader who then chose the English view, the Weave Off and the English order has. Pass it as `extra` when the scenario is of that reader and says nothing of the view. */
export const ENGLISH_READER: Record<string, string> = { readerView: 'english', weave: 'off', weaveOrder: 'english' };
