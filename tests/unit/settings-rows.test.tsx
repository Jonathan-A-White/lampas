// The rows of Settings (src/settings/rows.ts): one list says what every row is called, its one-line hint, its longer help and what it
// depends on; the screen draws exactly those rows, the search filters them and show-when-on reads their dependencies.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { SETTINGS } from '../../src/settings/registry';
import { GROUPS, ROWS, SECTIONS, foldText, groupOf, isHomeRow, rowOf, visibleRows, type Values } from '../../src/settings/rows';
import { showSettingsGroup } from '../support/settings-pages';

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

const keys = (rows: readonly { key: string }[]) => rows.map((r) => r.key);
const ALL_ON: Values = { greekInterest: '5', weave: 'solid', immersiveReader: 'on', newWordsADay: '3', 'resource.logos': 'on', devotional: 'random', developerMode: 'on' };
/** Values a row may read that are not rows of their own: Developer mode is found on About, it is not a setting of the list. */
const NOT_ROWS = ['developerMode'];

describe('the rows', () => {
  it('gives every row a distinct key, a name, a one-line hint and a section', () => {
    expect(new Set(keys(ROWS)).size).toBe(ROWS.length);
    const sections = SECTIONS.map((s) => s.id);
    for (const row of ROWS) {
      expect(row.label, row.key).not.toBe('');
      expect(row.hint, row.key).not.toBe('');
      expect(row.hint.length, `${row.key}'s hint is one line`).toBeLessThanOrEqual(90);
      expect(sections, row.key).toContain(row.section);
    }
  });

  it('holds every talkable setting, under its own key and name, and every dependency names a row', () => {
    for (const s of SETTINGS) {
      const row = rowOf(s.key);
      expect(row, s.key).toBeDefined();
      expect(row?.label).toBe(s.label);
    }
    for (const row of ROWS) if (row.dependsOn && !NOT_ROWS.includes(row.dependsOn.key)) expect(rowOf(row.dependsOn.key), row.key).toBeDefined();
  });

  it('lists the study resources and the links as rows too, so nothing on the screen is outside the list', () => {
    expect(keys(ROWS)).toEqual(
      expect.arrayContaining(['resource.strongs', 'resource.logos', 'resource.accordance', 'link.aboutyou', 'link.memory', 'link.studyway', 'link.words', 'link.review', 'link.paradigms', 'link.askmore', 'link.conversations', 'link.about']),
    );
  });

  it('marks the settings that only matter to the tutor as AI, and no other row', () => {
    expect(keys(ROWS.filter((r) => r.ai))).toEqual(['readTutor', 'askBy', 'hebrewDepth', 'tips', 'quizGoal']);
  });

  it('hides every Greek row by the dial: the settings that depend on it, or on a setting that does', () => {
    expect(rowOf('weave')?.dependsOn?.key).toBe('greekInterest');
    expect(rowOf('newWordsADay')?.dependsOn?.key).toBe('greekInterest');
  });

  it('takes its details from the setting they depend on', () => {
    const dependsOn = (key: string) => rowOf(key)?.dependsOn?.key;
    expect(dependsOn('weaveGrammar')).toBe('weave');
    expect(dependsOn('pickerGrammar')).toBe('newWordsADay');
    expect(dependsOn('grammarMove')).toBe('newWordsADay');
    expect(dependsOn('logosBible')).toBe('resource.logos');
    expect(dependsOn('immersiveHint')).toBe('immersiveReader');
    expect(dependsOn('theme')).toBeUndefined();
  });
});

describe('visibleRows', () => {
  it('hides a row whose setting is off and shows it when that is on', () => {
    expect(keys(visibleRows({}, ''))).not.toContain('weaveGrammar');
    expect(keys(visibleRows({ greekInterest: '5', weave: 'off', newWordsADay: '0' }, ''))).not.toEqual(expect.arrayContaining(['weaveGrammar', 'pickerGrammar', 'grammarMove', 'logosBible']));
    expect(keys(visibleRows(ALL_ON, ''))).toEqual(keys(ROWS));
  });

  it('matches the name or the hint, ignoring capitals and accents; clearing shows every row', () => {
    expect(keys(visibleRows(ALL_ON, 'THEME'))).toContain('theme');
    expect(keys(visibleRows(ALL_ON, 'wéave'))).toContain('weave');
    expect(keys(visibleRows(ALL_ON, ''))).toEqual(keys(ROWS));
    expect(keys(visibleRows(ALL_ON, '   '))).toEqual(keys(ROWS));
    const byHint = rowOf('theme')?.hint.split(' ').find((w) => w.length > 4 && !rowOf('theme')?.label.includes(w)) ?? '';
    expect(keys(visibleRows(ALL_ON, byHint.toUpperCase()))).toContain('theme');
  });

  it('shows the Logos settings for "logos", and the rows whose help names Logos after them in the list\'s order', () => {
    expect(keys(visibleRows(ALL_ON, 'logos')).slice(0, 3)).toEqual(['resource.logos', 'works', 'logosBible']);
    expect(keys(visibleRows(ALL_ON, 'logos'))).toEqual(expect.arrayContaining(['dailyPlan', 'dailyDevotional']));
  });

  it('reaches a hidden detail through the setting that turns it on', () => {
    expect(keys(visibleRows({}, 'bible in logos'))).toEqual(['resource.logos']);
  });

  it('finds nothing for words no row has', () => {
    expect(visibleRows(ALL_ON, 'zzzz')).toEqual([]);
  });

  it('folds accents and capitals the same way for Greek', () => {
    expect(foldText('Ἀγάπη')).toBe(foldText('αγαπη'));
  });
});

describe('the Settings screen', () => {
  const drawn = () => [...document.querySelectorAll('[data-setting]')].map((el) => el.getAttribute('data-setting'));

  it('draws exactly the rows of the list, each with its hint, when every detail is on', async () => {
    cleanup();
    window.location.hash = '#/settings';
    await db.settings.bulkPut([
      { key: 'weave', value: 'solid' },
      { key: 'immersiveReader', value: 'on' },
      { key: 'resource.logos', value: 'on' },
      { key: 'devotional', value: 'random' },
      { key: 'developerMode', value: 'on' },
    ]);
    render(<SettingsScreen />);
    // each group's page draws exactly its rows, in the order of the list
    const seen: string[] = [];
    for (const group of GROUPS) {
      await showSettingsGroup(group.id);
      const mine = ROWS.filter((row) => !isHomeRow(row) && groupOf(row.section).id === group.id);
      await waitFor(() => expect(drawn()).toEqual(keys(mine)));
      for (const row of mine) {
        expect(document.querySelector(`[data-setting="${row.key}"]`)?.textContent, row.key).toContain(row.hint);
        seen.push(row.key);
      }
    }
    // the Greek dial is drawn on the home above the groups, not on a page
    expect(seen.sort()).toEqual(keys(ROWS.filter((row) => !isHomeRow(row))).sort());
    cleanup();
  });

  it('draws only the rows that are visible while the Weave, New words a day and Logos are off', async () => {
    cleanup();
    window.location.hash = '#/settings';
    await db.settings.bulkPut([
      { key: 'weave', value: 'off' },
      { key: 'newWordsADay', value: '0' },
    ]);
    render(<SettingsScreen />);
    const visible = visibleRows({ greekInterest: '5', weave: 'off', newWordsADay: '0' }, '').filter((row) => !isHomeRow(row));
    const shown: string[] = [];
    for (const group of GROUPS) {
      await showSettingsGroup(group.id);
      const mine = visible.filter((row) => groupOf(row.section).id === group.id);
      await waitFor(() => expect(drawn()).toEqual(keys(mine)));
      shown.push(...drawn().map(String));
    }
    expect([...shown].sort()).toEqual(keys(visible).sort());
    expect(shown).not.toContain('weaveGrammar');
    cleanup();
  });
});
