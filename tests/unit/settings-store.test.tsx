// A setting declared once (docs/module-map.md R2): src/settings/define.ts declares it, src/settings/store.ts reads, saves and tells the bus,
// and src/settings/definitions/ lists the settings declared so (the pilot: theme, weave, tips, immersive). The registry and the rows are made from them.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getTheme, getTips, getWeave, setTheme, setTips, setWeave } from '../../src/data/repositories';
import { clearBus, latest, subscribe, type EventOf } from '../../src/events/bus';
import { defineSetting } from '../../src/settings/define';
import { DEFINITIONS, themeSetting, tipsSetting, weaveSetting } from '../../src/settings/definitions';
import { SETTINGS } from '../../src/settings/registry';
import { ROWS } from '../../src/settings/rows';
import { getSetting, onSetting, setSetting, toldSetting, useSetting } from '../../src/settings/store';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('getSetting', () => {
  it('gives the default when nothing is saved', async () => {
    expect(await getSetting(themeSetting)).toBe('phone');
    expect(await getSetting(weaveSetting)).toBe('off');
    expect(await getSetting(tipsSetting)).toBe('on');
  });

  it('gives the default when the saved value is not one the setting allows', async () => {
    await db.settings.bulkPut([
      { key: 'theme', value: 'purple' },
      { key: 'weave', value: 'everything' },
      { key: 'tips', value: 'sometimes' },
    ]);
    expect(await getSetting(themeSetting)).toBe('phone');
    expect(await getSetting(weaveSetting)).toBe('off');
    expect(await getSetting(tipsSetting)).toBe('on');
  });

  it('gives the saved value when it is one the setting allows', async () => {
    await db.settings.bulkPut([
      { key: 'theme', value: 'dark' },
      { key: 'weave', value: 'solid+learning' },
      { key: 'tips', value: 'off' },
    ]);
    expect(await getSetting(themeSetting)).toBe('dark');
    expect(await getSetting(weaveSetting)).toBe('solid+learning');
    expect(await getSetting(tipsSetting)).toBe('off');
  });
});

describe('setSetting', () => {
  it('saves, then publishes setting-changed once', async () => {
    const heard: { event: EventOf<'setting-changed'>; saved: unknown }[] = [];
    // the listener reads the store as it hears: the value is saved before the bus is told
    subscribe('setting-changed', (event) => void db.settings.get(event.key).then((row) => heard.push({ event, saved: row?.value })));
    let told = 0;
    subscribe('setting-changed', () => told++);
    await setSetting(weaveSetting, 'solid');
    expect(told).toBe(1);
    await waitFor(() => expect(heard).toHaveLength(1));
    expect(heard[0]).toEqual({ event: { kind: 'setting-changed', key: 'weave', value: 'solid' }, saved: 'solid' });
    expect(await getSetting(weaveSetting)).toBe('solid');
  });

  it('is what the old get/set pairs are: one-line wrappers over the store', async () => {
    await setTheme('light');
    await setWeave('solid');
    await setTips('off');
    expect(await getSetting(themeSetting)).toBe('light');
    expect(await getWeave()).toBe('solid');
    expect(await getTips()).toBe('off');
    expect(await getTheme()).toBe('light');
    expect(toldSetting(themeSetting)).toBe('light');
    expect(toldSetting(weaveSetting)).toBe('solid');
    expect(toldSetting(tipsSetting)).toBe('off');
  });
});

describe('onSetting and toldSetting', () => {
  it('hear only their own setting, parsed', async () => {
    const themes: string[] = [];
    onSetting(themeSetting, (theme) => themes.push(theme));
    await setSetting(weaveSetting, 'solid');
    await setSetting(themeSetting, 'dark');
    expect(themes).toEqual(['dark']);
    expect(toldSetting(weaveSetting)).toBe('solid');
    expect(toldSetting(themeSetting)).toBe('dark');
    expect(toldSetting(tipsSetting)).toBeUndefined();
    expect(latest('setting-changed')).toEqual({ kind: 'setting-changed', key: 'theme', value: 'dark' });
  });
});

describe('useSetting', () => {
  function Shows() {
    const theme = useSetting(themeSetting);
    return <p>theme {theme ?? 'loading'}</p>;
  }

  it('follows a change', async () => {
    render(<Shows />);
    await screen.findByText('theme phone');
    await act(() => setSetting(themeSetting, 'dark'));
    await screen.findByText('theme dark');
    await act(() => setTheme('light'));
    await screen.findByText('theme light');
  });
});

describe('defineSetting', () => {
  it('parses with the allowed choices when no parse is given', () => {
    const colour = defineSetting({
      key: 'colour',
      default: 'red',
      allowed: { kind: 'choice', values: [{ value: 'red', label: 'Red' }, { value: 'blue', label: 'Blue' }] },
      section: 'appearance',
      label: 'Colour',
      hint: 'A colour.',
    });
    expect(colour.parse('blue')).toBe('blue');
    expect(colour.parse('green')).toBe('red');
    expect(colour.parse(undefined)).toBe('red');
  });
});

describe('the definitions', () => {
  it('lists the settings declared once: the pilot', () => {
    expect(DEFINITIONS.map((d) => d.key)).toEqual(['theme', 'weave', 'tips', 'immersiveReader']);
  });

  it('make the registry entries and rows of the settings they declare', () => {
    for (const def of DEFINITIONS) {
      const entry = SETTINGS.find((s) => s.key === def.key);
      const row = ROWS.find((r) => r.key === def.key);
      expect(entry, def.key).toMatchObject({ label: def.label, hint: def.hint, help: def.help, section: def.section, allowed: def.allowed });
      expect(row, def.key).toMatchObject({ label: def.label, hint: def.hint, help: def.help, section: def.section });
    }
  });

  it('each default is a value the setting allows', () => {
    for (const def of DEFINITIONS) expect(def.parse(def.default), def.key).toBe(def.default);
  });
});
