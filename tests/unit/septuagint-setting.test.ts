// Settings home 'Old Testament in Greek (Septuagint)' (mw-u2w5klk.11): a setting under How much Greek?, Off to start, drawn from Curious up (hidden while Greek is at 0),
// found by the settings search for 'Septuagint', and kept.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { septuagintSetting } from '../../src/settings/definitions';
import { settingOf } from '../../src/settings/registry';
import { ROWS, visibleRows, readValues } from '../../src/settings/rows';
import { getSetting, setSetting } from '../../src/settings/store';
import { septuagintView, septuagintWeaveNoted } from '../../src/reader/septuagint';
import { getLogosBible, getLogosBibles, setLogosBibleFor } from '../../src/data/repositories';
import { DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';
import { biblesFor, DEFAULT_SEPTUAGINT_BIBLE, LOGOS_PARTS, septuagintLink } from '../../src/resources/logosBible';

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

  it('has a help line that says a hold on Hebrew or Greek in the Reader\'s header flips it (mw-u2w5klk.293)', () => {
    expect(septuagintSetting.help).toContain('holding Hebrew (or Greek, once it is on) in the header flips this setting');
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

// Settings > Bible in Logos > Septuagint (mw-u2w5klk.266): the fourth part of the Bible in Logos, the Septuagint a chapter Lampas has not shipped opens in.
const SWETE = 'LLS:OTGRKSWETETXT';

describe('the Septuagint part of the Bible in Logos', () => {
  it('lists the four Septuagints of his Logos library, Swete\'s Greek first', () => {
    expect(biblesFor('septuagint').map((b) => b.id)).toEqual([SWETE, 'LLS:OTGRKSWETEINTTXT', 'LLS:LELXX', 'LLS:BRENTONLXXEN']);
    expect(biblesFor('septuagint')[0].name).toBe('LXX Swete (The Old Testament in Greek according to the Septuagint)');
  });

  it('is the fourth of the parts Settings lists, kept under logosBibleSeptuagint', () => {
    expect(LOGOS_PARTS.map((p) => p.part)).toEqual(['nt', 'ot', 'apocrypha', 'septuagint']);
    expect(LOGOS_PARTS[3]).toEqual({ part: 'septuagint', label: 'Septuagint', key: 'logosBibleSeptuagint' });
  });

  it('starts in Swete\'s Greek, the text Lampas itself reads, and keeps the pick', async () => {
    expect(DEFAULT_SEPTUAGINT_BIBLE).toBe(SWETE);
    expect(await getLogosBibles()).toMatchObject({ septuagint: SWETE });
    await setLogosBibleFor('septuagint', 'LLS:LELXX');
    expect(await getLogosBible('septuagint')).toBe('LLS:LELXX');
    expect((await getLogosBibles()).nt).toBe(DEFAULT_LOGOS_BIBLE);
  });

  it('reads a saved store without the key as the default, and keeps a typed Resource ID as typed', async () => {
    await db.settings.put({ key: 'logosBible', value: 'LLS:NASB95' });
    expect((await getLogosBibles()).septuagint).toBe(SWETE);
    await setLogosBibleFor('septuagint', 'LLS:MYOWNLXX');
    expect((await getLogosBibles()).septuagint).toBe('LLS:MYOWNLXX');
  });

  it('is a row of Settings drawn while Logos is On, whatever the Septuagint setting says, and found by Septuagint', async () => {
    const row = ROWS.find((r) => r.key === 'logosBibleSeptuagint');
    expect(row?.section).toBe('resources');
    expect(row?.dependsOn).toEqual({ key: 'resource.logos', shown: expect.any(Function) });
    const shown = async (logos: 'on' | 'off', septuagint: 'on' | 'off', query = ''): Promise<boolean> => {
      await db.settings.put({ key: 'septuagint', value: septuagint });
      const values = { ...(await readValues()), 'resource.logos': logos };
      return visibleRows(values, query).some((r) => r.key === 'logosBibleSeptuagint');
    };
    expect(await shown('on', 'off')).toBe(true);
    expect(await shown('on', 'on')).toBe(true);
    expect(await shown('off', 'on')).toBe(false);
    expect(await shown('on', 'off', 'Septuagint')).toBe(true);
  });

  it('opens a chapter as a commentary\'s door does, in Lampas\'s numbering', () => {
    expect(septuagintLink('gen', 7, SWETE)).toEqual({ url: 'logosres:LLS:OTGRKSWETETXT;ref=Bible.Ge7', fallback: 'https://ref.ly/logosres/LLS%3AOTGRKSWETETXT?ref=Bible.Ge7' });
    expect(septuagintLink('isa', 1, 'LLS:LELXX')?.url).toBe('logosres:LLS:LELXX;ref=Bible.Isa1');
    expect(septuagintLink('rom', 1, SWETE)).toBeUndefined();
  });
});
