// Settings home 'Old Testament in Greek (Septuagint)' (mw-u2w5klk.11): a setting under How much Greek?, Off to start, drawn from Curious up (hidden while Greek is at 0),
// found by the settings search for 'Septuagint', and kept.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { septuagintSetting } from '../../src/settings/definitions';
import { settingOf } from '../../src/settings/registry';
import { ROWS, visibleRows, readValues } from '../../src/settings/rows';
import { getSetting, setSetting } from '../../src/settings/store';
import { septuagintView, septuagintWeaveNoted } from '../../src/reader/septuagint';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const LABEL = 'Old Testament in Greek (Septuagint)';

describe('the setting', () => {
  it('is Off to start, offers On and Off, has its label and help line, and sits on the home beside the Greek dial', () => {
    expect(septuagintSetting.key).toBe('septuagint');
    expect(septuagintSetting.default).toBe('off');
    expect(septuagintSetting.allowed).toEqual({ kind: 'choice', values: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }] });
    expect(septuagintSetting.label).toBe(LABEL);
    expect(septuagintSetting.hint).toBe('Swete’s Greek with Brenton’s English; the Hebrew when off.');
    expect(settingOf('septuagint')?.label).toBe(LABEL);
    expect(ROWS.find((r) => r.key === 'septuagint')?.section).toBe('dial');
  });

  it('is kept', async () => {
    expect(await getSetting(septuagintSetting)).toBe('off');
    await setSetting(septuagintSetting, 'on');
    expect(await getSetting(septuagintSetting)).toBe('on');
  });
});

describe('where Settings shows it', () => {
  const shown = async (query = ''): Promise<boolean> => visibleRows(await readValues(), query).some((r) => r.key === 'septuagint');

  it('is drawn with Greek at Curious and above (an unplaced phone reads All in)', async () => {
    expect(await shown()).toBe(true);
    await db.settings.put({ key: 'greekInterest', value: '1' });
    expect(await shown()).toBe(true);
  });

  it('is hidden while How much Greek? is at 0', async () => {
    await db.settings.put({ key: 'greekInterest', value: '0' });
    expect(await shown()).toBe(false);
    expect(await shown('Septuagint')).toBe(false);
  });

  it('is found by the search for Septuagint', async () => {
    expect(await shown('Septuagint')).toBe(true);
    expect(await shown('septuagint')).toBe(true);
  });
});

describe('the view a Septuagint chapter is drawn in (mw-u2w5klk.275)', () => {
  it('draws the Greek alone in the Greek position, whatever the Weave', () => {
    expect(septuagintView('greek', false)).toBe('greek');
    expect(septuagintView('greek', true)).toBe('greek');
  });

  it("draws Brenton's English as prose in the English position", () => {
    expect(septuagintView('english', false)).toBe('english');
  });

  it('draws the Greek verse, with no English under it, in the Weave position: there is nothing to weave', () => {
    expect(septuagintView('english', true)).toBe('greek');
  });

  it('notes that the Weave is off in the Weave position only', () => {
    expect(septuagintWeaveNoted('english', true)).toBe(true);
    expect(septuagintWeaveNoted('english', false)).toBe(false);
    expect(septuagintWeaveNoted('greek', true)).toBe(false);
    expect(septuagintWeaveNoted('greek', false)).toBe(false);
  });
});
