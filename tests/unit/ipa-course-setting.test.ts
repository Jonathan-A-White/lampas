// The IPA lesson as a setting (mw-gdcyf98.24, his words: "just like there's an optional lesson for IPA for Greek maybe there's an optional lesson whatever the equivalent is and
// that can be a setting"): ONE setting, `ipaLesson` (On | Off, On to start), widened to both languages; Settings > Listening > Pronunciation, a shared row from either dial at Curious
// or above; the tutor can set it; a saved Off is kept.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { DEFINITIONS, ipaCourseSetting } from '../../src/settings/definitions';
import { applyChanges, currentSettings, settingOf, undoChange, writeSetting } from '../../src/settings/registry';
import { readValues, visibleRows, type Values } from '../../src/settings/rows';
import { getSetting } from '../../src/settings/store';

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

const keysAt = (values: Values): string[] => visibleRows(values, '').map((r) => r.key);
const valuesOf = async (greek: number, hebrew: number): Promise<Values> => {
  await db.settings.bulkPut([
    { key: 'greekInterest', value: String(greek) },
    { key: 'hebrewInterest', value: String(hebrew) },
  ]);
  return readValues();
};

describe('the setting', () => {
  it('is ipaLesson, On | Off, On to start, in the pronunciation section, named for both languages', () => {
    expect(ipaCourseSetting.key).toBe('ipaLesson');
    expect(ipaCourseSetting.default).toBe('on');
    expect(ipaCourseSetting.section).toBe('pronunciation');
    expect(ipaCourseSetting.allowed).toMatchObject({
      kind: 'choice',
      values: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
    });
    for (const text of [ipaCourseSetting.hint, ipaCourseSetting.help ?? '']) {
      expect(text).toMatch(/Greek/);
      expect(text).toMatch(/Hebrew/);
    }
    expect(DEFINITIONS).toContain(ipaCourseSetting);
  });

  it('is On when nothing is saved, and a saved Off is kept across a reload', async () => {
    expect(await getSetting(ipaCourseSetting)).toBe('on');
    await writeSetting('ipaLesson', 'off');
    expect((await db.settings.get('ipaLesson'))?.value).toBe('off');
    db.close();
    await db.open();
    expect(await getSetting(ipaCourseSetting)).toBe('off');
    expect((await currentSettings()).ipaLesson).toBe('off');
  });

  it('reads anything it does not allow as On', async () => {
    await db.settings.put({ key: 'ipaLesson', value: 'maybe' });
    expect(await getSetting(ipaCourseSetting)).toBe('on');
  });
});

describe('its row', () => {
  it('is hidden at English only and shown with either dial at Curious or above', async () => {
    expect(keysAt(await valuesOf(0, 0))).not.toContain('ipaLesson');
    expect(keysAt(await valuesOf(1, 0))).toContain('ipaLesson');
    expect(keysAt(await valuesOf(0, 1))).toContain('ipaLesson');
    expect(keysAt(await valuesOf(5, 5))).toContain('ipaLesson');
  });

  it('sits in the same section as the English accent', () => {
    expect(settingOf('ipaLesson')?.section).toBe(settingOf('englishAccent')?.section);
  });
});

describe('the tutor', () => {
  it('can turn it Off and On in settings_changes, and Undo puts it back', async () => {
    const off = await applyChanges([{ key: 'ipaLesson', value: 'off' }]);
    expect(off.refused).toEqual([]);
    expect(off.applied).toHaveLength(1);
    expect(off.applied[0]).toMatchObject({ key: 'ipaLesson', from: 'on', to: 'off' });
    expect((await db.settings.get('ipaLesson'))?.value).toBe('off');
    await undoChange(off.applied[0]);
    expect((await currentSettings()).ipaLesson).toBe('on');
    const bad = await applyChanges([{ key: 'ipaLesson', value: 'maybe' }]);
    expect(bad.applied).toEqual([]);
    expect(bad.refused).toHaveLength(1);
  });
});
