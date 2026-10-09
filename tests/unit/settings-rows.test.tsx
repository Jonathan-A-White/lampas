// The rows of Settings (src/settings/rows.ts): one list says what every row is called, its one-line hint, its longer help and what it
// depends on; the screen draws exactly those rows, the search filters them and show-when-on reads their dependencies.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { SETTINGS } from '../../src/settings/registry';
import { ROWS, SECTIONS, foldText, rowOf, visibleRows, type Values } from '../../src/settings/rows';

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
const ALL_ON: Values = { weave: 'solid', newWordsADay: '3', 'resource.logos': 'on', developerMode: 'on' };
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
      expect.arrayContaining(['resource.strongs', 'resource.logos', 'resource.accordance', 'link.studyway', 'link.words', 'link.review', 'link.paradigms', 'link.about']),
    );
  });

  it('takes its details from the setting they depend on', () => {
    const dependsOn = (key: string) => rowOf(key)?.dependsOn?.key;
    expect(dependsOn('weaveGrammar')).toBe('weave');
    expect(dependsOn('pickerGrammar')).toBe('newWordsADay');
    expect(dependsOn('grammarMove')).toBe('newWordsADay');
    expect(dependsOn('logosBible')).toBe('resource.logos');
    expect(dependsOn('theme')).toBeUndefined();
  });
});

describe('visibleRows', () => {
  it('hides a row whose setting is off and shows it when that is on', () => {
    expect(keys(visibleRows({}, ''))).not.toContain('weaveGrammar');
    expect(keys(visibleRows({ weave: 'off', newWordsADay: '0' }, ''))).not.toEqual(expect.arrayContaining(['weaveGrammar', 'pickerGrammar', 'grammarMove', 'logosBible']));
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

  it('shows only the Logos settings for "logos"', () => {
    expect(keys(visibleRows(ALL_ON, 'logos'))).toEqual(['resource.logos', 'logosBible']);
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
      { key: 'resource.logos', value: 'on' },
      { key: 'developerMode', value: 'on' },
    ]);
    render(<SettingsScreen />);
    await screen.findByRole('group', { name: 'Bible in Logos' });
    await screen.findByRole('group', { name: 'Grammar' });
    await screen.findByRole('group', { name: 'Move it' });
    await screen.findByRole('radiogroup', { name: 'Greek pronunciation' });
    expect(drawn()).toEqual(keys(ROWS));
    for (const row of ROWS) {
      expect(document.querySelector(`[data-setting="${row.key}"]`)?.textContent, row.key).toContain(row.hint);
    }
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
    await screen.findByRole('group', { name: 'New words a day' });
    await waitFor(() => expect(drawn()).toEqual(keys(visibleRows({ weave: 'off', newWordsADay: '0' }, ''))));
    expect(drawn()).not.toContain('weaveGrammar');
    cleanup();
  });
});
