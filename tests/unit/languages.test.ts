// The languages he reads and how far into each (mw-gdcyf98.2): a dial per language with the same six steps, 'Which languages?' as the two dials' own state, the writes of
// that row (they move the dials and keep their levels for the way back), and where a phone starts on both.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import {
  getGoal,
  getGreekInterest,
  getHebrewInterest,
  getLanguages,
  getNewWordsADay,
  getReaderView,
  getWeave,
  placeInterest,
  raiseHebrewInterest,
  setGoal,
  setGreekInterest,
  setHebrewInterest,
  setLanguages,
  setNewWordsADay,
} from '../../src/data/repositories';
import { isExistingReader, startWelcomeIfFirst } from '../../src/data/repositories/welcome';
import { GREEK_LEVELS, greekInterestSetting, greekLevelOf } from '../../src/settings/definitions/greekInterest';
import { HEBREW_LEVELS, hebrewFrom, hebrewInterestSetting, hebrewLevelOf } from '../../src/settings/definitions/hebrewInterest';
import { depthFrom, interestSetting, languagesOf, levelsOf } from '../../src/settings/definitions/interest';
import { readValues, visibleRows } from '../../src/settings/rows';
import { settingOf } from '../../src/settings/registry';

beforeEach(async () => {
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.settings.clear(), db.talks.clear()]);
});

const languages = async () => settingOf('languages')?.read();

describe('the two tables', () => {
  it('give the Hebrew dial the same six steps as the Greek one, each line naming its own language only', () => {
    expect(HEBREW_LEVELS.map((l) => l.level)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(HEBREW_LEVELS.map((l) => l.name)).toEqual(['Just English', 'Curious', 'Dipping a toe', 'Learning', 'Reading in Hebrew', 'All in']);
    expect(GREEK_LEVELS.map((l) => l.name)).toEqual(['Just English', 'Curious', 'Dipping a toe', 'Learning', 'Reading in Greek', 'All in']);
    for (const l of HEBREW_LEVELS) {
      expect(l.line.length, l.name).toBeGreaterThan(20);
      expect(l.line.length, l.name).toBeLessThanOrEqual(120);
      expect(l.line, `${l.name} (Hebrew) names Greek`).not.toMatch(/Greek/);
    }
    for (const l of GREEK_LEVELS) {
      expect(l.line, `${l.name} (Greek) names Hebrew`).not.toMatch(/Hebrew/);
      expect(l.line.length, l.name).toBeLessThanOrEqual(120);
    }
    expect(GREEK_LEVELS[5].line).not.toContain('Hebrew in the tutor');
  });

  it('are the dial per language: levelsOf gives each its table, and the Greek one is GREEK_LEVELS', () => {
    expect(levelsOf('grc')).toBe(GREEK_LEVELS);
    expect(levelsOf('hbo')).toBe(HEBREW_LEVELS);
  });

  it('declare the two dials as section dial, the Hebrew one called "How much Hebrew?", both choosing among "0" to "5"', () => {
    expect(hebrewInterestSetting.label).toBe('How much Hebrew?');
    expect(hebrewInterestSetting.key).toBe('hebrewInterest');
    expect(greekInterestSetting.label).toBe('How much Greek?');
    for (const def of [greekInterestSetting, hebrewInterestSetting, interestSetting('hbo')]) {
      expect(def.section).toBe('dial');
      expect(def.allowed.kind === 'choice' ? def.allowed.values.map((v) => v.value) : []).toEqual(['0', '1', '2', '3', '4', '5']);
    }
  });

  it('read an unplaced Greek dial as All in and an unplaced Hebrew one as none, and any invalid text as that', () => {
    expect(greekLevelOf(undefined)).toBe(5);
    expect(greekLevelOf('9')).toBe(5);
    expect(hebrewLevelOf(undefined)).toBe(0);
    expect(hebrewLevelOf('x')).toBe(0);
    expect(hebrewLevelOf('3')).toBe(3);
  });

  it('give a dependency its dial: hebrewFrom(n) reads the Hebrew dial and depthFrom(n) the higher of the two', () => {
    expect(hebrewFrom(2).key).toBe('hebrewInterest');
    expect([0, 1, 2, 3].map((n) => hebrewFrom(2).shown(String(n)))).toEqual([false, false, true, true]);
    expect(depthFrom(3).key).toBe('depth');
    expect([2, 3].map((n) => depthFrom(3).shown(String(n)))).toEqual([false, true]);
  });
});

describe('Which languages? reads the two dials', () => {
  it('answers english when both stand at 0, greek or hebrew when one does, and both when neither does', async () => {
    expect(languagesOf(0, 0)).toBe('english');
    expect(languagesOf(3, 0)).toBe('greek');
    expect(languagesOf(0, 2)).toBe('hebrew');
    expect(languagesOf(1, 5)).toBe('both');
    await setGreekInterest(0);
    expect(await languages()).toBe('english');
    await setGreekInterest(3);
    expect(await languages()).toBe('greek');
    await setHebrewInterest(2);
    expect(await languages()).toBe('both');
    await setGreekInterest(0);
    expect(await languages()).toBe('hebrew');
  });

  it('is a row with no store of its own: the first of the home, section dial, with the four values', () => {
    const entry = settingOf('languages');
    expect(entry?.label).toBe('Which languages?');
    expect(entry?.section).toBe('dial');
    expect(entry?.allowed.kind === 'choice' ? entry.allowed.values : []).toEqual([
      { value: 'english', label: 'English only' },
      { value: 'greek', label: 'Greek' },
      { value: 'hebrew', label: 'Hebrew' },
      { value: 'both', label: 'Greek and Hebrew' },
    ]);
  });

  it('is answered by readValues as languages, and `depth` as the higher of the two dials', async () => {
    await setGreekInterest(2);
    await setHebrewInterest(4);
    const values = await readValues();
    expect(values.languages).toBe('both');
    expect(values.depth).toBe('4');
    expect(values.greekInterest).toBe('2');
    expect(values.hebrewInterest).toBe('4');
  });

  it('hides a dial while its language is not chosen, and the Greek rows with it', async () => {
    await setGreekInterest(3);
    await setHebrewInterest(0);
    const shown = new Set(visibleRows(await readValues(), '').map((r) => r.key));
    expect(shown.has('greekInterest')).toBe(true);
    expect(shown.has('hebrewInterest')).toBe(false);
    expect(shown.has('hebrewDepth')).toBe(false);
    expect(shown.has('greekVoice')).toBe(true);
  });
});

describe('Which languages? writes move the dials', () => {
  const write = (value: string) => settingOf('languages')!.write(value);
  // a phone as the app places it: both dials at 0 and nothing kept (an unplaced phone reads Greek at 5)
  beforeEach(async () => {
    await placeInterest();
  });

  it('english puts both dials at 0', async () => {
    await setGreekInterest(3);
    await setHebrewInterest(2);
    await write('english');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([0, 0]);
    expect(await languages()).toBe('english');
  });

  it('greek puts Hebrew at 0 and raises Greek from 0 to 1 when nothing was kept', async () => {
    await setGreekInterest(0);
    await setHebrewInterest(3);
    await write('greek');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([1, 0]);
  });

  it('greek keeps Greek where it stood when it already stands above 0', async () => {
    await setGreekInterest(4);
    await setHebrewInterest(2);
    await write('greek');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([4, 0]);
  });

  it('hebrew is the mirror: Greek to 0, Hebrew from 0 to 1', async () => {
    await setGreekInterest(4);
    await setHebrewInterest(0);
    await write('hebrew');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([0, 1]);
  });

  it('both raises each dial that stands at 0 to 1 and leaves the other where it was', async () => {
    await setGreekInterest(0);
    await setHebrewInterest(0);
    await write('both');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([1, 1]);
    await setGreekInterest(4);
    await write('both');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([4, 1]);
  });

  it('english then both restores each dial to the level it was left at, and his values with it', async () => {
    await setHebrewInterest(4);
    await setGreekInterest(3);
    await setNewWordsADay(10);
    await write('english');
    expect(await getNewWordsADay()).toBe(0);
    expect(await getReaderView()).toBe('english');
    await write('both');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([3, 4]);
    expect(await getNewWordsADay()).toBe(10);
    // the kept levels are gone once restored
    expect((await db.settings.toArray()).filter((r) => r.key.endsWith('Kept.level'))).toEqual([]);
  });

  it('keeps a level under greekKept.level and hebrewKept.level when a dial goes to 0', async () => {
    await setGreekInterest(3);
    await setHebrewInterest(2);
    await setLanguages('english');
    expect((await db.settings.get('greekKept.level'))?.value).toBe('3');
    expect((await db.settings.get('hebrewKept.level'))?.value).toBe('2');
    await setLanguages('greek');
    expect(await getGreekInterest()).toBe(3);
    expect(await getHebrewInterest()).toBe(0);
    await setLanguages('hebrew');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([0, 2]);
  });

  it('writes through the registry as the tutor does: settings_changes of languages and of hebrewInterest', async () => {
    await setGreekInterest(3);
    await setHebrewInterest(3);
    await settingOf('hebrewInterest')?.write('0');
    expect(await languages()).toBe('greek');
    await settingOf('languages')?.write('both');
    expect(await getHebrewInterest()).toBe(3);
  });

  it('raises the Hebrew dial and never lowers it', async () => {
    await setHebrewInterest(2);
    await raiseHebrewInterest(4);
    expect(await getHebrewInterest()).toBe(4);
    await raiseHebrewInterest(1);
    expect(await getHebrewInterest()).toBe(4);
    expect(await getLanguages()).toBe('hebrew');
  });
});

describe('moving a dial changes what the higher of the two shows', () => {
  it('turns new words off when Greek 3 goes to 0 with Hebrew at 0, and keeps them while Hebrew stands at 3', async () => {
    await setGreekInterest(3);
    await setNewWordsADay(10);
    await setGreekInterest(0);
    expect(await getNewWordsADay()).toBe(0);
    await setGreekInterest(3);
    await setHebrewInterest(3);
    await setGreekInterest(0);
    expect(await getNewWordsADay()).toBe(10);
    await setHebrewInterest(0);
    expect(await getNewWordsADay()).toBe(0);
  });

  it('brings the source view and restores a goal when Hebrew goes from 0 to 4 with Greek at 0', async () => {
    await setGreekInterest(4);
    await setGoal('Romans 8');
    await setGreekInterest(0);
    expect(await getGoal()).toBe('');
    expect(await getReaderView()).toBe('english');
    await setHebrewInterest(4);
    expect(await getReaderView()).toBe('greek');
    expect(await getWeave()).toBe('solid');
    expect(await getGoal()).toBe('Romans 8');
  });
});

describe('where a phone starts on both', () => {
  it('places a phone with nothing of a reader at 0 and 0, and writes nothing else (it stays a new reader)', async () => {
    expect(await placeInterest()).toEqual({ greek: 0, hebrew: 0 });
    expect((await db.settings.toArray()).map((r) => r.key).sort()).toEqual(['greekInterest', 'hebrewInterest']);
    expect(await isExistingReader()).toBe(false);
  });

  it('writes the Hebrew dial equal to the Greek one for a phone that had only the Greek one, once', async () => {
    await db.settings.put({ key: 'greekInterest', value: '4' });
    expect(await placeInterest()).toEqual({ greek: 4, hebrew: 4 });
    expect(await getHebrewInterest()).toBe(4);
    // once: the Greek dial moves on, the Hebrew one is not written again
    await setGreekInterest(2);
    await placeInterest();
    expect(await getHebrewInterest()).toBe(4);
  });

  it('places a reader from before by what he has, and Hebrew with it', async () => {
    await db.settings.put({ key: 'readerView', value: 'greek' });
    expect(await placeInterest()).toEqual({ greek: 4, hebrew: 4 });
  });

  it('reads the Hebrew test seam beside the Greek one and, absent, follows it', async () => {
    window.localStorage.setItem('lampas.greekInterestStart', '5');
    expect(await placeInterest()).toEqual({ greek: 5, hebrew: 5 });
    await db.settings.clear();
    window.localStorage.setItem('lampas.hebrewInterestStart', '2');
    expect(await placeInterest()).toEqual({ greek: 5, hebrew: 2 });
  });

  it('starts a new licensed reader at both 0 through the welcome\'s one English-defaults function', async () => {
    await setGreekInterest(4);
    await setHebrewInterest(3);
    window.localStorage.clear();
    await db.settings.clear();
    expect(await startWelcomeIfFirst()).toBe('pending');
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([0, 0]);
    expect(await getReaderView()).toBe('english');
  });
});
