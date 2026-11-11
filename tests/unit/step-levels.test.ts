// The feature steps' helper that puts a phone at a Greek or Hebrew level (features/steps/levels.ts, mw-fnvjof.17.80) writes the level AND every setting the dial brings in with it, so a
// scenario starts where tapping the step leaves a phone (weave Solid at 2, the Greek view at 4), not at a bare level the screen never shows him.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { putAtLevels, rowsAtLevels, settingsAtLevels } from '../../features/steps/levels';
import { db } from '../../src/data/db';
import { placeInterest, setGreekInterest, setHebrewInterest } from '../../src/data/repositories';
import type { GreekLevel } from '../../src/settings/definitions/greekInterest';

const LEVELS: readonly GreekLevel[] = [0, 1, 2, 3, 4, 5];
const stored = async () => Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, String(r.value)]));

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

describe('features/steps/levels.ts', () => {
  it('leaves weave Solid at level 2', async () => {
    await putAtLevels({ greek: 2 });
    const kept = await stored();
    expect(kept.greekInterest).toBe('2');
    expect(kept.weave).toBe('solid');
  });

  it('leaves the Greek view at level 4 (and the weave and word order with it)', async () => {
    await putAtLevels({ greek: 4 });
    const kept = await stored();
    expect(kept.readerView).toBe('greek');
    expect(kept.weave).toBe('solid');
    expect(kept.weaveOrder).toBe('greek');
  });

  it('writes only the dial it was given, and brings nothing at levels 0 and 1', () => {
    expect(rowsAtLevels({ greek: 1 })).toEqual([{ key: 'greekInterest', value: '1' }]);
    expect(settingsAtLevels({ hebrew: 0 })).toEqual({ hebrewInterest: '0' });
  });

  it('brings what the higher dial brings, for a Hebrew dial at 5 and for two dials', () => {
    expect(settingsAtLevels({ hebrew: 5 })).toMatchObject({ hebrewInterest: '5', readerView: 'greek', weave: 'solid' });
    expect(settingsAtLevels({ greek: 0, hebrew: 3 })).toMatchObject({ greekInterest: '0', hebrewInterest: '3', weave: 'solid', newWordsADay: '3' });
    expect(settingsAtLevels({ greek: 0, hebrew: 3 }).readerView).toBeUndefined();
  });

  it('writes the extra settings with the level, the extra winning', async () => {
    await putAtLevels({ hebrew: 5 }, { readerView: 'english' });
    expect((await stored()).readerView).toBe('english');
  });

  for (const level of LEVELS) {
    it(`matches what the dial itself leaves in the store when climbed to ${level} from 0`, async () => {
      await placeInterest(); // unplaced, the dial reads 5 and the climb brings nothing
      await setGreekInterest(level);
      await setHebrewInterest(level);
      const dial = await stored();
      for (const { key, value } of rowsAtLevels({ greek: level, hebrew: level })) expect(dial[key], key).toBe(value);
    });
  }
});
