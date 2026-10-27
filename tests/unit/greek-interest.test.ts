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
  setHebrewInterest,
  setNewWordsADay,
  setQuizGoal,
  setReaderView,
  setWeave,
} from '../../src/data/repositories';
import { startWelcomeIfFirst, isExistingReader, showWelcomeAgain } from '../../src/data/repositories/welcome';
import { getSetting, setSetting } from '../../src/settings/store';
import { handwritingSetting, readLessonsSetting, weaveOrderSetting } from '../../src/settings/definitions';
import { GREEK_LEVELS, greekFrom, newWordsAt, placementOf, viewAt, weaveAt, type GreekLevel } from '../../src/settings/definitions/greekInterest';
import { languagesOf } from '../../src/settings/definitions/interest';
import { ROWS, visibleRows, type Values } from '../../src/settings/rows';
import { settingOf } from '../../src/settings/registry';
import { SEPARATE_KEYS } from '../../src/settings/definitions/pronunciation';

const LEVELS: readonly GreekLevel[] = [0, 1, 2, 3, 4, 5];

/** Which dial a row follows: the Greek one, the Hebrew one, or 'depth' (the higher of the two, for a row both languages share). */
type Follows = 'greekInterest' | 'hebrewInterest' | 'depth';

/** Every row a dial decides, the dial it follows and the least level at which that dial shows it (the epic's table, mw-3ased2, and mw-gdcyf98.2's columns). */
const GREEK_ROWS: Readonly<Record<string, readonly [Follows, GreekLevel]>> = {
  greekVoice: ['greekInterest', 1],
  greekRate: ['greekInterest', 1],
  greekPronunciation: ['greekInterest', 1],
  greekKeyboard: ['greekInterest', 1],
  hebrewVoice: ['hebrewInterest', 1],
  hebrewRate: ['hebrewInterest', 1],
  hebrewKeyboard: ['hebrewInterest', 1],
  hebrewPronunciation: ['hebrewInterest', 1],
  pronunciationSeparate: ['depth', 1],
  'resource.strongs': ['greekInterest', 1],
  'link.words': ['depth', 1],
  'link.review': ['depth', 1],
  weave: ['depth', 2],
  weaveOrder: ['depth', 2],
  weaveGrammar: ['depth', 2],
  'link.goal': ['depth', 3],
  newWordsADay: ['depth', 3],
  pickerGrammar: ['depth', 3],
  grammarMove: ['depth', 3],
  grammarApproach: ['greekInterest', 3],
  handwritingDrills: ['greekInterest', 3],
  readLessons: ['depth', 3],
  quizGoal: ['depth', 3],
  goal: ['depth', 4],
  hebrewDepth: ['hebrewInterest', 1],
  'link.paradigms': ['depth', 5],
  paradigmExtent: ['depth', 5],
};

/** The values the rows' dependencies read with every detail switched on, at the Greek dial `greek` and the Hebrew dial `hebrew` (readValues answers `languages` and `depth` the same way). */
const valuesAt = (greek: GreekLevel, hebrew: GreekLevel = 0): Values => ({
  languages: languagesOf(greek, hebrew),
  greekInterest: String(greek),
  hebrewInterest: String(hebrew),
  depth: String(Math.max(greek, hebrew)),
  weave: 'solid',
  newWordsADay: '3',
  // Set each language on its own is On, so a language's own pronunciation row follows its dial (readValues derives the two keys from the switch and the dial)
  pronunciationSeparate: 'on',
  'pronunciationSeparate.grc': greek >= 1 ? 'on' : 'off',
  'pronunciationSeparate.he': hebrew >= 1 ? 'on' : 'off',
});

/** The level the dial a row follows stands at. */
const levelFor = (follows: Follows, greek: GreekLevel, hebrew: GreekLevel): number => (follows === 'greekInterest' ? greek : follows === 'hebrewInterest' ? hebrew : Math.max(greek, hebrew));

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

  it('shows at every pair of levels exactly the rows the table gives it, by the dial each follows (the Greek one, the Hebrew one, or the higher)', () => {
    for (const greek of LEVELS) {
      for (const hebrew of LEVELS) {
        const shown = new Set(visibleRows(valuesAt(greek, hebrew), '').map((r) => r.key));
        for (const [key, [follows, from]] of Object.entries(GREEK_ROWS)) {
          expect(shown.has(key), `${key} at Greek ${greek} and Hebrew ${hebrew} (${follows} from ${from})`).toBe(levelFor(follows, greek, hebrew) >= from);
        }
      }
    }
  });

  it('shows no such row with both dials at 0 and every one with both at 5, and keeps each dial on the home while its language is chosen', () => {
    expect(visibleRows(valuesAt(0, 0), '').filter((r) => r.key in GREEK_ROWS)).toEqual([]);
    expect(visibleRows(valuesAt(5, 5), '').filter((r) => r.key in GREEK_ROWS)).toHaveLength(Object.keys(GREEK_ROWS).length);
    for (const level of LEVELS.slice(1)) {
      expect(visibleRows(valuesAt(level, 0), '').some((r) => r.key === 'greekInterest')).toBe(true);
      expect(visibleRows(valuesAt(level, 0), '').some((r) => r.key === 'hebrewInterest')).toBe(false);
    }
    expect(visibleRows(valuesAt(0, 0), '').some((r) => r.key === 'greekInterest' || r.key === 'hebrewInterest')).toBe(false);
    expect(ROWS.find((r) => r.key === 'greekInterest')?.section).toBe('dial');
  });

  it('lists a row only because of the dial it follows or a setting that depends on it (no second visibility mechanism)', () => {
    for (const [key, [follows]] of Object.entries(GREEK_ROWS)) {
      const row = ROWS.find((r) => r.key === key);
      expect(row, key).toBeDefined();
      // a language's own pronunciation row follows its dial through the key readValues derives from the switch and that dial
      const reaches = (k: string | undefined): boolean => k === follows || (follows === 'greekInterest' && k === SEPARATE_KEYS.grc) || (follows === 'hebrewInterest' && k === SEPARATE_KEYS.he);
      let at = row;
      while (at?.dependsOn && !reaches(at.dependsOn.key)) at = ROWS.find((r) => r.key === at?.dependsOn?.key);
      expect(reaches(at?.dependsOn?.key), `${key} reaches ${follows}`).toBe(true);
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

  // the Hebrew dial (mw-gdcyf98.2): the settings follow the higher of the two dials, so every expectation above is the Greek dial alone with the Hebrew one at 0
  it('turns new words off when Greek 3 goes to 0 with Hebrew at 0, and keeps them when Hebrew stands at 3', async () => {
    await setGreekInterest(3);
    await setNewWordsADay(10);
    await setGreekInterest(0);
    expect(await getNewWordsADay()).toBe(0);
    await setGreekInterest(3);
    await setHebrewInterest(3);
    await setGreekInterest(0);
    expect(await getNewWordsADay()).toBe(10);
  });

  it('brings the source view and a goal he kept when Hebrew goes from 0 to 4', async () => {
    await setGreekInterest(4);
    await setGoal('Romans 8');
    await setGreekInterest(0);
    await setHebrewInterest(4);
    expect(await getReaderView()).toBe('greek');
    expect(await getGoal()).toBe('Romans 8');
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
