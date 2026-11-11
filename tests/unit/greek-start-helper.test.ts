// The e2e helper that puts a phone at a Greek or Hebrew level (tests/e2e/greek-start.ts, mw-fnvjof.17.74) writes the level AND every setting the dial brings in with it, so a
// spec starts where tapping the step leaves a phone (weave Solid at 2, the Greek view at 4), not at a bare level the screen never shows him.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { placeInterest, setGreekInterest, setHebrewInterest } from '../../src/data/repositories';
import type { GreekLevel } from '../../src/settings/definitions/greekInterest';
import { rowsAtLevels } from '../e2e/greek-start';

const valueOf = (rows: { key: string; value: string }[], key: string): string | undefined => rows.find((r) => r.key === key)?.value;
const LEVELS: readonly GreekLevel[] = [0, 1, 2, 3, 4, 5];

beforeEach(async () => {
  await db.settings.clear();
});

describe('rowsAtLevels', () => {
  it('leaves weave Solid at level 2', () => {
    const rows = rowsAtLevels({ greek: 2 });
    expect(valueOf(rows, 'greekInterest')).toBe('2');
    expect(valueOf(rows, 'weave')).toBe('solid');
  });

  it('leaves the Greek view at level 4 (and the weave and word order with it)', () => {
    const rows = rowsAtLevels({ greek: 4 });
    expect(valueOf(rows, 'readerView')).toBe('greek');
    expect(valueOf(rows, 'weave')).toBe('solid');
    expect(valueOf(rows, 'weaveOrder')).toBe('greek');
    expect(valueOf(rows, 'newWordsADay')).toBe('5');
  });

  it('brings nothing at levels 0 and 1, and writes only the dial it was given', () => {
    expect(rowsAtLevels({ greek: 1 })).toEqual([{ key: 'greekInterest', value: '1' }]);
    expect(rowsAtLevels({ hebrew: 0 })).toEqual([{ key: 'hebrewInterest', value: '0' }]);
  });

  it('brings what the higher dial brings for a Hebrew dial', () => {
    const rows = rowsAtLevels({ hebrew: 5 });
    expect(valueOf(rows, 'hebrewInterest')).toBe('5');
    expect(valueOf(rows, 'greekInterest')).toBeUndefined();
    expect(valueOf(rows, 'readerView')).toBe('greek');
  });

  for (const level of LEVELS) {
    it(`matches what the dial itself leaves in the store when climbed to ${level} from 0`, async () => {
      await placeInterest(); // a new phone stands at 0 on both dials; unplaced, the dial reads 5 and the climb brings nothing
      await setGreekInterest(level);
      await setHebrewInterest(level);
      const stored = Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, String(r.value)]));
      for (const { key, value } of rowsAtLevels({ greek: level, hebrew: level })) expect(stored[key], key).toBe(value);
    });
  }
});
