// The settings registry (src/settings/registry.ts): every Settings row has an entry, a talked change is checked against it,
// applied through the same write the Settings screen uses (saved and told to the bus), and undone.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { getGreekPronunciation, getLayout, getSectionHeadings, getSpeechRate, getTextSize, getTheme, getVoice, getWeave } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
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
    // jsdom has no speechSynthesis: two voice pickers still draw, empty
    render(<SettingsScreen />);
    await screen.findByRole('slider', { name: 'Greek speed' });
    await screen.findByRole('combobox', { name: 'Greek voice' });
    await screen.findByRole('radiogroup', { name: 'Greek pronunciation' });
    await screen.findByRole('group', { name: 'Weave' });
    const drawn = [
      ...screen.getAllByRole('group'),
      ...screen.getAllByRole('radiogroup'),
      ...screen.getAllByRole('combobox'),
      ...screen.getAllByRole('slider'),
    ].map((el) => el.getAttribute('aria-label') ?? el.closest('label')?.querySelector('span')?.textContent ?? '');
    expect(drawn.filter((name) => name === '')).toEqual([]);
    expect([...drawn].sort()).toEqual(SETTINGS.map((s) => s.label).sort());
    cleanup();
  });

  it('gives every entry a distinct key, a label, a hint, and the values it allows', () => {
    expect(new Set(SETTINGS.map((s) => s.key)).size).toBe(SETTINGS.length);
    expect(SETTINGS.map((s) => s.key).sort()).toEqual(
      ['englishRate', 'englishVoice', 'greekPronunciation', 'greekRate', 'greekVoice', 'layout', 'sectionHeadings', 'textSize', 'theme', 'weave'],
    );
    for (const s of SETTINGS) {
      expect(s.label).not.toBe('');
      expect(s.hint).not.toBe('');
      if (s.allowed.kind === 'choice') expect(s.allowed.values.length).toBeGreaterThan(0);
    }
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
      'Weave: Solid words',
      'Greek pronunciation: Modern Greek',
      'English speed 1.2x',
      'Greek voice: Phone default',
    ]);
    expect(await getTheme()).toBe('dark');
    expect(await getTextSize()).toBe(130);
    expect(await getLayout()).toBe('paragraph');
    expect(await getSectionHeadings()).toBe('off');
    expect(await getWeave()).toBe('solid');
    expect(await getGreekPronunciation()).toBe('modern');
    expect(await getSpeechRate('english')).toBe(1.2);
    expect(await getVoice('greek')).toBeNull();
    expect(latest('theme-changed')?.theme).toBe('dark');
    expect(latest('text-size-changed')?.percent).toBe(130);
    expect(latest('layout-changed')?.layout).toBe('paragraph');
    expect(latest('headings-changed')?.headings).toBe('off');
    expect(latest('weave-changed')?.weave).toBe('solid');
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
      theme: 'phone',
      textSize: 'normal',
      layout: 'verse',
      sectionHeadings: 'on',
      weave: 'off',
      englishVoice: 'default',
      greekVoice: 'default',
      englishRate: 1,
      greekRate: 1,
      greekPronunciation: 'modern',
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
