// src/data/repositories/greekBrings.ts — the dial's level table, apart from the code that moves the dial (greekInterest.ts, which exports it too): it imports nothing but a type, so a Playwright spec
// (tests/e2e/greek-start.ts) can load it, which it cannot greekInterest.ts (the database, the bus and the settings behind it).
import type { GreekLevel } from '../../settings/definitions/greekInterest';

/** What each step brings in, to its starting values, on the way up (the epic mw-3ased2: the level table). */
export const BRINGS: Readonly<Partial<Record<GreekLevel, Readonly<Record<string, string>>>>> = {
  2: { weave: 'solid' },
  3: { newWordsADay: '3' },
  4: { readerView: 'greek', weaveOrder: 'greek', newWordsADay: '5' },
};

/** The starting values the steps 1 to `level` bring in on the way up from 0, by setting key, a later step's value winning over an earlier one's (moveDial writes them in that
 * order): what the dial leaves in the store for a phone that climbs to `level`. A spec that puts a phone at a level without the dial writes these too (tests/e2e/greek-start.ts). */
export function broughtUpTo(level: GreekLevel): Record<string, string> {
  const out: Record<string, string> = {};
  for (let step = 1; step <= level; step += 1) Object.assign(out, BRINGS[step as GreekLevel] ?? {});
  return out;
}

