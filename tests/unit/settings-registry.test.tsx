// The settings registry (src/settings/registry.ts): every Settings row has an entry, a talked change is checked against it,
// applied through the same write the Settings screen uses (saved and told to the bus), and undone.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { getGreekPronunciation, getLayout, getLogosBible, getSectionHeadings, getSpeechRate, getTextSize, getTheme, getVoice, getWeave, getWeaveGrammar } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { getStudyResources } from '../../src/data/repositories';
import { GROUPS, isTalkable, ROWS, groupOf, isHomeRow } from '../../src/settings/rows';
import { showSettingsGroup } from '../support/settings-pages';
import { SETTINGS, applyChanges, currentSettings, settingOf, undoChange } from '../../src/settings/registry';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('the registry lists every Settings row', () => {
  it('has an entry for each control the Settings screen draws, named as the screen names it', async () => {
    cleanup();
    window.location.hash = '#/settings';
    // a setting's details are drawn only while it is on (mw-5r3p30.106): turn on the ones that have some
    await db.settings.bulkPut([
      { key: 'weave', value: 'solid' },
      { key: 'immersiveReader', value: 'on' },
      { key: 'resource.logos', value: 'on' },
      { key: 'devotional', value: 'random' },
    ]);
    // jsdom has no speechSynthesis: two voice pickers still draw, empty
    render(<SettingsScreen />);
    const drawnOnPage = (): string[] =>
      [
        // Logos' ticked lists of lexicons and of grammar books (mw-5r3p30.381) and the line that asks for another book (mw-5r3p30.382) belong to the Logos switch, a study resource kept outside the registry; Request a devotional is a request box, not a setting
        ...screen.queryAllByRole('group').filter((el) => !['Logos lexicons', 'Grammar books', 'Ask for another book', 'Request a devotional'].includes(el.getAttribute('aria-label') ?? '')),
        ...screen.queryAllByRole('radiogroup'),
        // the Goal group's own Book, Chapter and Verse pickers, and Bible in Logos' own Bible list, are parts of those one settings
        ...screen.queryAllByRole('combobox').filter((el) => !el.closest('[role="group"][aria-label="Goal"], [role="group"][aria-label="Bible in Logos"]')),
        ...screen.queryAllByRole('slider'),
      ].map((el) => el.getAttribute('aria-label') ?? el.closest('label')?.querySelector('span')?.textContent ?? '');
    // each group's page draws the controls of the settings its sections hold, and nothing else (one grammar path: no choice to draw for the Grammar approach, mw-foy5mb.1, so the row's content is the group);
    // the study-resource switches are checkboxes, not groups: the Settings screen's other tests draw them
    const all: string[] = [];
    for (const group of GROUPS) {
      await showSettingsGroup(group.id);
      const expected = SETTINGS.filter((s) => !isHomeRow(s) && groupOf(s.section).id === group.id && !s.key.startsWith('resource.'))
        .map((s) => s.label)
        .sort();
      await waitFor(() => expect(drawnOnPage().sort()).toEqual(expected));
      all.push(...drawnOnPage());
    }
    // the Greek dial is drawn on the home above the groups, not on a page of a group
    expect([...all].sort()).toEqual(SETTINGS.filter((s) => !isHomeRow(s) && !s.key.startsWith('resource.')).map((s) => s.label).sort());
    cleanup();
  });

  it('gives every entry a distinct key, a label, a hint, and the values it allows', () => {
    expect(new Set(SETTINGS.map((s) => s.key)).size).toBe(SETTINGS.length);
    expect(SETTINGS.map((s) => s.key).sort()).toEqual(
      ['askBy', 'audioBible', 'dailyDevotional', 'dailyPlan', 'dailyPsalms', 'dailyReview', 'dailyTicks', 'devotional', 'devotionalDraw', 'englishAccent', 'englishRate', 'englishVoice', 'font', 'goal', 'grammarApproach', 'grammarMove', 'greekInterest', 'greekPronunciation', 'greekRate', 'greekVoice', 'handwritingDrills', 'hebrewDepth', 'immersiveHint', 'immersiveReader', 'layout', 'logosBible', 'newWordsADay', 'paradigmExtent', 'pickerGrammar', 'quizGoal', 'readLessons', 'readSpan', 'readTutor', 'readingMode', 'readingPlan', 'resource.accordance', 'resource.logos', 'resource.strongs', 'sectionHeadings', 'send', 'talk', 'textSize', 'theme', 'tips', 'todaysDevotional', 'weave', 'weaveGrammar', 'weaveOrder'],
    );
    for (const s of SETTINGS) {
      expect(s.label).not.toBe('');
      expect(s.hint).not.toBe('');
      if (s.allowed.kind === 'choice') expect(s.allowed.values.length).toBeGreaterThan(0);
    }
  });
});

/** The rows that are not settings the tutor may change: links to other screens, the request boxes, and Developer mode, which is found on About
 * and kept outside the registry on purpose. */
const NOT_TALKABLE = (key: string): boolean => !isTalkable(key);

describe('the allow-list is the Settings screen\'s own list (mw-5r3p30.100)', () => {
  it('holds every row of the Settings screen but the links, the request boxes and Developer mode, with the same name', () => {
    const talkable = ROWS.filter((r) => !NOT_TALKABLE(r.key));
    expect(talkable.length).toBeGreaterThan(20);
    for (const row of talkable) {
      const entry = settingOf(row.key);
      expect(entry, `${row.key} is a setting on the screen but not on the allow-list`).toBeDefined();
      expect(entry?.label).toBe(row.label);
    }
    expect(SETTINGS.map((s) => s.key).sort()).toEqual(talkable.map((r) => r.key).sort());
  });

  it('refuses the rows that are left out', async () => {
    const { applied, refused } = await applyChanges([{ key: 'developer', value: 'on' }, { key: 'link.words', value: 'on' }, { key: 'request.devotional', value: 'on' }, { key: 'developerMode', value: 'on' }]);
    expect(applied).toEqual([]);
    expect(refused).toHaveLength(4);
    expect(await db.settings.get('developerMode')).toBeUndefined();
  });

  it('turns a study resource on and off by its switch, kept in the store, and Undo puts it back', async () => {
    const { applied, refused } = await applyChanges([{ key: 'resource.strongs', value: 'on' }]);
    expect(refused).toEqual([]);
    expect(applied).toEqual([{ key: 'resource.strongs', label: "Strong's", from: 'off', to: 'on', shown: "Strong's: On" }]);
    expect((await getStudyResources()).on).toEqual(['strongs']);
    expect((await currentSettings())['resource.strongs']).toBe('on');
    await undoChange(applied[0]);
    expect((await getStudyResources()).on).toEqual([]);
    const bad = await applyChanges([{ key: 'resource.strongs', value: 'maybe' }, { key: 'resource.nothing', value: 'on' }]);
    expect(bad.applied).toEqual([]);
    expect(bad.refused).toHaveLength(2);
    expect((await getStudyResources()).on).toEqual([]);
  });

  it('shows the Bible in Logos row to the tutor as a detail of the Logos switch', () => {
    expect(settingOf('logosBible')?.dependsOn?.key).toBe('resource.logos');
    expect(settingOf('resource.logos')?.section).toBe('resources');
  });
});

describe('New words a day', () => {
  it('is 3 until chosen; a talked change to Off, 3, 5 or 10 is kept, anything else is refused', async () => {
    expect(await settingOf('newWordsADay')?.read()).toBe('3');
    const { applied, refused } = await applyChanges([
      { key: 'newWordsADay', value: '10' },
      { key: 'newWordsADay', value: '7' },
    ]);
    expect(applied.map((a) => a.shown)).toEqual(['New words a day: 10']);
    expect(refused).toHaveLength(1);
    expect(await settingOf('newWordsADay')?.read()).toBe('10');
    await applyChanges([{ key: 'newWordsADay', value: '0' }]);
    expect(settingOf('newWordsADay')?.show('0')).toBe('New words a day: Off');
    expect(await settingOf('newWordsADay')?.read()).toBe('0');
  });
});

describe('Bible in Logos', () => {
  it('is LSB until chosen; a talked change to a well-formed Resource ID is kept, and a malformed one is refused', async () => {
    expect(await getLogosBible()).toBe('LLS:LGCYSTNDRDBBLSB');
    const { applied, refused } = await applyChanges([
      { key: 'logosBible', value: 'LLS:1.0.710' },
      { key: 'logosBible', value: 'esv' },
    ]);
    expect(applied.map((a) => a.shown)).toEqual(['Bible in Logos: ESV (English Standard Version)']);
    expect(refused).toHaveLength(1);
    expect(await getLogosBible()).toBe('LLS:1.0.710');
    await undoChange(applied[0]);
    expect(await getLogosBible()).toBe('LLS:LGCYSTNDRDBBLSB');
  });
});

describe('applyChanges', () => {
  it('applies a valid change, saves it and tells the bus; the change remembers what it replaced', async () => {
    const { applied, refused } = await applyChanges([{ key: 'greekRate', value: 0.8 }]);
    expect(refused).toEqual([]);
    expect(applied).toEqual([{ key: 'greekRate', label: 'Greek speed', from: 1, to: 0.8, shown: 'Greek speed 0.8x' }]);
    expect(await getSpeechRate('greek')).toBe(0.8);
    expect(await getSpeechRate('english')).toBe(1);
    expect(latest('rates-changed')?.rates).toEqual({ english: 1, greek: 0.8 });
  });

  it('applies each kind of setting through its own saved choice and bus event', async () => {
    const { applied, refused } = await applyChanges([
      { key: 'theme', value: 'dark' },
      { key: 'textSize', value: 'large' },
      { key: 'layout', value: 'paragraph' },
      { key: 'sectionHeadings', value: 'off' },
      { key: 'weave', value: 'solid' },
      { key: 'weaveGrammar', value: 'solid+frontier' },
      { key: 'greekPronunciation', value: 'modern' },
      { key: 'englishRate', value: 1.2 },
      { key: 'greekVoice', value: 'default' },
    ]);
    expect(refused).toEqual([]);
    expect(applied.map((a) => a.shown)).toEqual([
      'Theme: Dark',
      'Text size: Large',
      'Layout: Paragraph',
      'Section headings: Off',
      'Weave: Solid',
      'Grammar: + Frontier',
      'Greek pronunciation: Modern Greek',
      'English speed 1.2x',
      'Greek voice: Phone default',
    ]);
    expect(await getTheme()).toBe('dark');
    expect(await getTextSize()).toBe(130);
    expect(await getLayout()).toBe('paragraph');
    expect(await getSectionHeadings()).toBe('off');
    expect(await getWeave()).toBe('solid');
    expect(await getWeaveGrammar()).toBe('solid+frontier');
    expect(await getGreekPronunciation()).toBe('modern');
    expect(await getSpeechRate('english')).toBe(1.2);
    expect(await getVoice('greek')).toBeNull();
    expect(latest('theme-changed')?.theme).toBe('dark');
    expect(latest('text-size-changed')?.percent).toBe(130);
    expect(latest('layout-changed')?.layout).toBe('paragraph');
    expect(latest('headings-changed')?.headings).toBe('off');
    expect(latest('weave-changed')?.weave).toBe('solid');
    expect(latest('weave-grammar-changed')?.grammar).toBe('solid+frontier');
    expect(latest('voices-changed')).toMatchObject({ greek: null });
  });

  it('refuses an unknown key, a value the setting does not allow, and a change that is not a {key, value}, and says so', async () => {
    const { applied, refused } = await applyChanges([
      { key: 'fontColour', value: 'red' },
      { key: 'theme', value: 'purple' },
      { key: 'greekRate', value: 5 },
      { key: 'greekRate', value: 'fast' },
      { key: 'greekVoice', value: 'Some Voice' },
      'dark theme',
      null,
      { key: 'layout' },
    ]);
    expect(applied).toEqual([]);
    expect(refused).toHaveLength(8);
    expect(refused[0]).toContain('fontColour');
    expect(refused[1]).toContain('Theme');
    expect(refused[1]).toContain('purple');
    expect(await getTheme()).toBe('phone');
    expect(await getSpeechRate('greek')).toBe(1);
    expect(await db.settings.count()).toBe(0);
    expect(latest('theme-changed')).toBeUndefined();
  });

  it('applies the valid ones and refuses the rest of the same answer', async () => {
    const { applied, refused } = await applyChanges([{ key: 'theme', value: 'dark' }, { key: 'nope', value: 1 }]);
    expect(applied.map((a) => a.key)).toEqual(['theme']);
    expect(refused).toHaveLength(1);
    expect(await getTheme()).toBe('dark');
  });

  it('applies at most the first few changes of one answer', async () => {
    const many = Array.from({ length: 30 }, () => ({ key: 'theme', value: 'dark' }));
    const { applied, refused } = await applyChanges(many);
    expect(applied.length + refused.length).toBeLessThan(30);
  });

  it('applies nothing when there is nothing to apply', async () => {
    expect(await applyChanges(undefined)).toEqual({ applied: [], refused: [] });
    expect(await applyChanges([])).toEqual({ applied: [], refused: [] });
  });
});

describe('undoChange', () => {
  it('puts back what the change replaced, saved and on the bus', async () => {
    await applyChanges([{ key: 'greekRate', value: 0.9 }]);
    const { applied } = await applyChanges([{ key: 'greekRate', value: 0.7 }, { key: 'theme', value: 'light' }]);
    expect(applied[0]).toMatchObject({ from: 0.9, to: 0.7 });
    await undoChange(applied[0]);
    expect(await getSpeechRate('greek')).toBe(0.9);
    expect(latest('rates-changed')?.rates.greek).toBe(0.9);
    await undoChange(applied[1]);
    expect(await getTheme()).toBe('phone');
    expect(latest('theme-changed')?.theme).toBe('phone');
  });

  it('puts back a voice he had chosen, which no talk could name', async () => {
    await db.settings.put({ key: 'voice.greek', value: 'Greek (Greece)' });
    const { applied } = await applyChanges([{ key: 'greekVoice', value: 'default' }]);
    expect(await getVoice('greek')).toBeNull();
    await undoChange(applied[0]);
    expect(await getVoice('greek')).toBe('Greek (Greece)');
  });
});

describe('currentSettings', () => {
  it('reports every setting as the grind may name it', async () => {
    expect(await currentSettings()).toEqual({
      greekInterest: '5',
      theme: 'phone',
      font: 'phone',
      textSize: 'normal',
      layout: 'verse',
      readingMode: 'scroll',
      sectionHeadings: 'on',
      immersiveReader: 'off',
      immersiveHint: 'on',
      readSpan: 'chapter',
      readLessons: 'off',
      readTutor: 'on',
      askBy: 'speaking',
      talk: 'hold',
      send: 'release',
      hebrewDepth: 'both',
      tips: 'on',
      weave: 'off',
      weaveGrammar: 'any',
      weaveOrder: 'english',
      englishVoice: 'default',
      greekVoice: 'default',
      englishRate: 1,
      greekRate: 1,
      greekPronunciation: 'modern',
      englishAccent: 'american',
      goal: '',
      grammarApproach: 'ladder',
      handwritingDrills: 'auto',
      pickerGrammar: 'frontier',
      paradigmExtent: 'solid+frontier',
      grammarMove: 'ask',
      newWordsADay: '3',
      logosBible: 'LLS:LGCYSTNDRDBBLSB',
      quizGoal: '',
      'resource.strongs': 'off',
      'resource.logos': 'off',
      'resource.accordance': 'off',
      audioBible: 'off',
      readingPlan: 'off',
      dailyReview: 'on',
      dailyPlan: 'on',
      dailyPsalms: 'on',
      dailyDevotional: 'on',
      devotional: 'LLS:20.10.1',
      devotionalDraw: 'all',
      todaysDevotional: 'LLS:20.10.1',
      dailyTicks: 'on',
    });
    await applyChanges([{ key: 'greekRate', value: 0.8 }, { key: 'theme', value: 'dark' }]);
    await db.settings.put({ key: 'voice.english', value: 'Some voice' });
    const now = await currentSettings();
    expect(now).toMatchObject({ greekRate: 0.8, theme: 'dark', englishVoice: 'other' });
    expect(settingOf('theme')?.label).toBe('Theme');
    expect(settingOf('nothing')).toBeUndefined();
    await waitFor(() => expect(true).toBe(true));
  });
});
