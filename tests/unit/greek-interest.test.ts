// The Greek dial (mw-3ased2.2): 'How much Greek?', 0 to 5, each step a real change. The table says which settings each level shows (by the ordinary dependsOn rule,
// src/settings/rows.ts), moving the dial writes what the level brings in and turns off what it hides (keeping his own values for the way back up), a new reader
// starts at 0 through the welcome's one English-defaults function, and an existing reader is placed by what he has, once.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import {
  getGoal,
  getGreekInterest,
  getNewWordsADay,
  getQuizGoal,
  getReaderView,
  getWeave,
  placeGreekInterest,
  setGoal,
  setGreekInterest,
  setNewWordsADay,
  setQuizGoal,
  setReaderView,
  setWeave,
} from '../../src/data/repositories';
import { startWelcomeIfFirst, isExistingReader, showWelcomeAgain } from '../../src/data/repositories/welcome';
import { getSetting, setSetting } from '../../src/settings/store';
import { handwritingSetting, readLessonsSetting, weaveOrderSetting } from '../../src/settings/definitions';
import { GREEK_LEVELS, greekFrom, newWordsAt, placementOf, viewAt, weaveAt, type GreekLevel } from '../../src/settings/definitions/greekInterest';
import { ROWS, visibleRows, type Values } from '../../src/settings/rows';
import { settingOf } from '../../src/settings/registry';

const LEVELS: readonly GreekLevel[] = [0, 1, 2, 3, 4, 5];

/** Every row that is Greek, and the least level at which the dial shows it (the epic's table, mw-3ased2). */
const GREEK_ROWS: Readonly<Record<string, GreekLevel>> = {
  greekVoice: 1,
  greekRate: 1,
  greekPronunciation: 1,
  'resource.strongs': 1,
  'link.words': 1,
  'link.review': 1,
  weave: 2,
  weaveOrder: 2,
  weaveGrammar: 2,
  newWordsADay: 3,
  pickerGrammar: 3,
  grammarMove: 3,
  grammarApproach: 3,
  handwritingDrills: 3,
  readLessons: 3,
  quizGoal: 3,
  goal: 4,
  hebrewDepth: 5,
  'link.paradigms': 5,
};

/** The values the rows' dependencies read with every Greek detail switched on, at dial level `level`. */
const valuesAt = (level: GreekLevel): Values => ({ greekInterest: String(level), weave: 'solid', newWordsADay: '3' });

beforeEach(async () => {
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.settings.clear(), db.talks.clear()]);
});

describe('the table', () => {
  it('has six steps, each with a name and one line of what it means', () => {
    expect(GREEK_LEVELS.map((l) => l.level)).toEqual(LEVELS);
    expect(GREEK_LEVELS.map((l) => l.name)).toEqual(['Just English', 'Curious', 'Dipping a toe', 'Learning', 'Reading in Greek', 'All in']);
    for (const l of GREEK_LEVELS) {
      expect(l.line.length, l.name).toBeGreaterThan(20);
      expect(l.line.length, l.name).toBeLessThanOrEqual(120);
      expect(l.name, 'a name, never a bare number').not.toMatch(/^\d+$/);
    }
  });

  it('shows at each level exactly the Greek rows the table gives it, by the dependsOn rule', () => {
    for (const level of LEVELS) {
      const shown = new Set(visibleRows(valuesAt(level), '').map((r) => r.key));
      for (const [key, from] of Object.entries(GREEK_ROWS)) {
        expect(shown.has(key), `${key} at level ${level} (shown from ${from})`).toBe(level >= from);
      }
    }
  });

  it('shows no Greek row at 0 and every one at 5, and keeps the dial itself on the home', () => {
    expect(visibleRows(valuesAt(0), '').filter((r) => r.key in GREEK_ROWS)).toEqual([]);
    expect(visibleRows(valuesAt(5), '').filter((r) => r.key in GREEK_ROWS)).toHaveLength(Object.keys(GREEK_ROWS).length);
    for (const level of LEVELS) expect(visibleRows(valuesAt(level), '').some((r) => r.key === 'greekInterest')).toBe(true);
    expect(ROWS.find((r) => r.key === 'greekInterest')?.section).toBe('dial');
  });

  it('lists a Greek row only because of the dial or a setting that depends on it (no second visibility mechanism)', () => {
    for (const key of Object.keys(GREEK_ROWS)) {
      const row = ROWS.find((r) => r.key === key);
      expect(row, key).toBeDefined();
      let at = row;
      while (at?.dependsOn && at.dependsOn.key !== 'greekInterest') at = ROWS.find((r) => r.key === at?.dependsOn?.key);
      expect(at?.dependsOn?.key, `${key} reaches the dial`).toBe('greekInterest');
    }
  });

  it('greekFrom(n) is shown from n up', () => {
    const dep = greekFrom(3);
    expect(dep.key).toBe('greekInterest');
    expect([0, 1, 2, 3, 4, 5].map((n) => dep.shown(String(n)))).toEqual([false, false, false, true, true, true]);
  });
});

describe('what the dial hides from the Reader', () => {
  it('shows the Greek view from 1, the Weave from 2 and the new words from 3', () => {
    expect(LEVELS.map((l) => viewAt(l, 'greek'))).toEqual(['english', 'greek', 'greek', 'greek', 'greek', 'greek']);
    expect(LEVELS.map((l) => weaveAt(l, 'solid'))).toEqual(['off', 'off', 'solid', 'solid', 'solid', 'solid']);
    expect(LEVELS.map((l) => newWordsAt(l, 5))).toEqual([0, 0, 0, 5, 5, 5]);
  });
});

describe('moving the dial', () => {
  it('reads 5 (nothing hidden) until the phone is placed', async () => {
    expect(await getGreekInterest()).toBe(5);
  });

  it('brings in each level\'s starting values on the way up', async () => {
    await setGreekInterest(0);
    await setGreekInterest(2);
    expect(await getWeave()).toBe('solid');
    expect(await getNewWordsADay()).toBe(0);
    await setGreekInterest(3);
    expect(await getNewWordsADay()).toBe(3);
    await setGreekInterest(4);
    expect(await getReaderView()).toBe('greek');
    expect(await getSetting(weaveOrderSetting)).toBe('greek');
    expect(await getNewWordsADay()).toBe(5);
    expect(await getGreekInterest()).toBe(4);
  });

  it('turns off at 0 what the other levels bring, so a hidden setting never acts', async () => {
    await setGreekInterest(4);
    await setGoal('Romans 8');
    await setQuizGoal('learning Greek');
    await setSetting(handwritingSetting, 'on');
    await setSetting(readLessonsSetting, 'on');
    await setGreekInterest(0);
    expect(await getReaderView()).toBe('english');
    expect(await getWeave()).toBe('off');
    expect(await getNewWordsADay()).toBe(0);
    expect(await getGoal()).toBe('');
    expect(await getQuizGoal()).toBe('');
    expect(await getSetting(handwritingSetting)).toBe('off');
    expect(await getSetting(readLessonsSetting)).toBe('off');
  });

  it('turns off only what the lower level hides', async () => {
    await setGreekInterest(0);
    await setGreekInterest(4);
    await setGreekInterest(2);
    expect(await getNewWordsADay()).toBe(0);
    expect(await getWeave()).toBe('solid');
    expect(await getReaderView()).toBe('greek');
  });

  it('restores his own values on the way back up (new words 10 at 3, down to 0, up to 3: 10 again)', async () => {
    await setGreekInterest(3);
    await setNewWordsADay(10);
    await setGreekInterest(0);
    expect(await getNewWordsADay()).toBe(0);
    await setGreekInterest(3);
    expect(await getNewWordsADay()).toBe(10);
  });

  it('restores the rest of his values too, and a goal he had at 4', async () => {
    await setGreekInterest(4);
    await setReaderView('english');
    await setWeave('solid+learning');
    await setGoal('1 John 1:1');
    await setSetting(handwritingSetting, 'on');
    await setGreekInterest(0);
    await setGreekInterest(5);
    expect(await getReaderView()).toBe('english');
    expect(await getWeave()).toBe('solid+learning');
    expect(await getGoal()).toBe('1 John 1:1');
    expect(await getSetting(handwritingSetting)).toBe('on');
  });

  it('keeps a Weave he had turned off off, going back up (his value, not the level\'s start)', async () => {
    await setGreekInterest(3);
    await setWeave('off');
    await setGreekInterest(0);
    await setGreekInterest(3);
    expect(await getWeave()).toBe('off');
  });

  it('leaves no kept value behind once it is restored, and the settings count of a reader stays his own', async () => {
    await setGreekInterest(3);
    await setNewWordsADay(10);
    await setGreekInterest(0);
    expect((await db.settings.toArray()).some((r) => r.key.startsWith('greekKept.'))).toBe(true);
    await setGreekInterest(5);
    expect((await db.settings.toArray()).some((r) => r.key.startsWith('greekKept.'))).toBe(false);
  });

  it('is moved by the registry entry too (the tutor and the Settings dial write through it)', async () => {
    const entry = settingOf('greekInterest');
    expect(entry).toBeDefined();
    await entry?.write('2');
    expect(await getGreekInterest()).toBe(2);
    expect(await entry?.read()).toBe('2');
    expect(entry?.allowed).toMatchObject({ kind: 'choice' });
    expect(entry?.allowed.kind === 'choice' ? entry.allowed.values.map((v) => v.value) : []).toEqual(['0', '1', '2', '3', '4', '5']);
  });
});

describe('where a reader starts', () => {
  it('places an existing reader by what he has: Greek view 4, new words above 0 is 3, Weave on 2, else 0', () => {
    expect(placementOf({ view: 'greek', newWords: 0, weave: 'off' })).toBe(4);
    expect(placementOf({ view: 'greek', newWords: 5, weave: 'solid' })).toBe(4);
    expect(placementOf({ view: 'english', newWords: 3, weave: 'solid' })).toBe(3);
    expect(placementOf({ view: 'english', newWords: 0, weave: 'solid+learning' })).toBe(2);
    expect(placementOf({ view: 'english', newWords: 0, weave: 'off' })).toBe(0);
  });

  it('places a phone with nothing kept at 0 and writes nothing else (it stays a new reader)', async () => {
    expect(await placeGreekInterest()).toBe(0);
    expect(await getGreekInterest()).toBe(0);
    expect((await db.settings.toArray()).map((r) => r.key)).toEqual(['greekInterest']);
    expect(await isExistingReader()).toBe(false);
  });

  it('places an existing reader by his settings', async () => {
    await db.settings.put({ key: 'readerView', value: 'greek' });
    expect(await placeGreekInterest()).toBe(4);
    await db.settings.clear();
    await db.settings.put({ key: 'newWordsADay', value: '5' });
    expect(await placeGreekInterest()).toBe(3);
    await db.settings.clear();
    await db.settings.bulkPut([{ key: 'newWordsADay', value: '0' }, { key: 'weave', value: 'solid' }]);
    expect(await placeGreekInterest()).toBe(2);
    await db.settings.clear();
    await db.settings.bulkPut([{ key: 'newWordsADay', value: '0' }, { key: 'layout', value: 'paragraph' }]);
    expect(await placeGreekInterest()).toBe(0);
  });

  it('places an existing reader whose new words were never set at 3 (the default is 3)', async () => {
    await db.settings.put({ key: 'layout', value: 'paragraph' });
    expect(await placeGreekInterest()).toBe(3);
  });

  it('places once: a second call keeps the level, however his settings have moved since', async () => {
    await db.settings.put({ key: 'readerView', value: 'greek' });
    expect(await placeGreekInterest()).toBe(4);
    await db.settings.put({ key: 'readerView', value: 'english' });
    await db.settings.put({ key: 'newWordsADay', value: '0' });
    expect(await placeGreekInterest()).toBe(4);
    expect(await getGreekInterest()).toBe(4);
  });

  it('places a reader from a booted test seam: a start level in localStorage is a phone\'s first level', async () => {
    window.localStorage.setItem('lampas.greekInterestStart', '5');
    expect(await placeGreekInterest()).toBe(5);
    expect(await getGreekInterest()).toBe(5);
  });

  it('starts a new licensed reader at 0 through the welcome\'s English defaults', async () => {
    expect(await startWelcomeIfFirst()).toBe('pending');
    expect(await getGreekInterest()).toBe(0);
    expect(await getReaderView()).toBe('english');
    expect(await getWeave()).toBe('off');
    expect(await getNewWordsADay()).toBe(0);
  });

  it('puts the dial back to 0 with the English defaults when the welcome is shown again', async () => {
    await setGreekInterest(4);
    await showWelcomeAgain();
    expect(await getGreekInterest()).toBe(0);
    expect(await getReaderView()).toBe('english');
    expect(await getNewWordsADay()).toBe(0);
  });

  it('does not count the dial or its kept values as a reader\'s own settings', async () => {
    await placeGreekInterest();
    await db.settings.put({ key: 'greekKept.weave', value: 'solid' });
    expect(await isExistingReader()).toBe(false);
  });
});
