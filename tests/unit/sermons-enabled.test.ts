// Which sermon sources are on (src/sermons/enabled.ts, mw-qtu3zvz.3): the switches Settings > Study resources > Sermons keep ('sermons.<id>'), the Logos switch a source that needs it rides on, the
// setting each source makes (src/settings/definitions/sermons.ts), the tutor's classification of the rows and the hook that asks again when a switch changes.
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { publish } from '../../src/events/bus';
import { enabledSources, SOURCES } from '../../src/sermons';
import { enabledSources as enabledOf } from '../../src/sermons/enabled';
import type { SermonSource } from '../../src/sermons/types';
import { useSermons } from '../../src/sermons/useSermons';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';
import { settingOf } from '../../src/settings/registry';
import { BEARS_ON } from '../../src/tutor/knows';
import { forgetTestSermons, offSource, registerTestSermons, secondSource, testSource } from '../support/test-sermons';

const reader = (values: Record<string, string>) => (key: string): string | undefined => values[key];
const ids = (sources: readonly SermonSource[]): string[] => sources.map((s) => s.id);
const needingLogos: SermonSource = { ...secondSource, id: 'testlogos', name: 'Test Logos Archive', needs: 'logos' };

describe('enabledSources (pure)', () => {
  const sources = [testSource, secondSource];

  it('keeps every source whose switch is on, in the registry order', () => {
    expect(ids(enabledOf(sources, reader({ 'sermons.testsermons': 'on', 'sermons.testsecond': 'on' })))).toEqual(['testsermons', 'testsecond']);
  });

  it('leaves out a source whose switch is off', () => {
    expect(ids(enabledOf(sources, reader({ 'sermons.testsermons': 'off' })))).toEqual(['testsecond']);
    expect(ids(enabledOf(sources, reader({ 'sermons.testsecond': 'off' })))).toEqual(['testsermons']);
  });

  it("takes a source's own default where nothing is saved", () => {
    expect(ids(enabledOf([testSource, offSource], reader({})))).toEqual(['testsermons']);
    expect(ids(enabledOf([testSource, offSource], reader({ 'sermons.testoff': 'on' })))).toEqual(['testsermons', 'testoff']);
  });

  it('leaves out a source that needs Logos while resource.logos is not on, whatever its own switch says', () => {
    const all = [testSource, needingLogos];
    expect(ids(enabledOf(all, reader({ 'sermons.testlogos': 'on', 'resource.logos': 'off' })))).toEqual(['testsermons']);
    expect(ids(enabledOf(all, reader({ 'sermons.testlogos': 'on' })))).toEqual(['testsermons']);
    expect(ids(enabledOf(all, reader({ 'sermons.testlogos': 'on', 'resource.logos': 'on' })))).toEqual(['testsermons', 'testlogos']);
    expect(ids(enabledOf(all, reader({ 'sermons.testlogos': 'off', 'resource.logos': 'on' })))).toEqual(['testsermons']);
  });
});

describe('the setting of a source (sermonSourceSetting)', () => {
  it('is an On | Off switch under the key sermons.<id>, labelled with the name and hinted with the description, as the source defaults', () => {
    const setting = sermonSourceSetting(testSource);
    expect(setting.key).toBe('sermons.testsermons');
    expect(setting.section).toBe('sermons');
    expect(setting.label).toBe('Test Sermons');
    expect(setting.hint).toBe(testSource.describe);
    expect(setting.default).toBe('on');
    expect(setting.allowed).toEqual({
      kind: 'choice',
      values: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
    });
    expect(setting.dependsOn).toBeUndefined();
    expect(sermonSourceSetting(offSource).default).toBe('off');
  });

  it('rides on the Logos resource for a source that needs it', () => {
    const setting = sermonSourceSetting(needingLogos);
    expect(setting.dependsOn?.key).toBe('resource.logos');
    expect(setting.dependsOn?.shown('on')).toBe(true);
    expect(setting.dependsOn?.shown('off')).toBe(false);
  });

  it('keeps a label inside the 40 characters the tutor is told a setting’s name in, by dropping a bracketed qualifier', () => {
    const long = sermonSourceSetting({ ...testSource, name: 'Greg Laurie’s sermons (his Logos archive)' });
    expect(long.label).toBe('Greg Laurie’s sermons');
    expect(sermonSourceSetting({ ...testSource, name: 'Spurgeon’s sermons (CCEL)' }).label).toBe('Spurgeon’s sermons (CCEL)');
  });
});

describe('the registered sources and the registry of settings', () => {
  it('has one row, sermons.<id>, for each bundled source, each starting as the source says, and the tutor may flip them', () => {
    expect(SOURCES.length).toBeGreaterThan(0);
    for (const source of SOURCES) {
      const entry = settingOf(`sermons.${source.id}`);
      expect(entry, source.id).toBeDefined();
      expect(BEARS_ON[`sermons.${source.id}`], source.id).toBe('screen');
    }
    expect(ids(enabledOf(SOURCES, reader({})))).toEqual(SOURCES.filter((s) => s.default === 'on' && !s.needs).map((s) => s.id));
    // every bundled source that is not a Logos archive starts On
    expect(SOURCES.filter((s) => !s.id.endsWith('-logos')).every((s) => s.default === 'on')).toBe(true);
  });
});

describe('enabledSources() over the store', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
    registerTestSermons({ second: true });
  });
  afterEach(forgetTestSermons);

  it('answers every source that starts On, then drops one that is switched Off', async () => {
    expect(ids(await enabledSources())).toEqual(['testsermons', 'testsecond']);
    await db.settings.put({ key: 'sermons.testsecond', value: 'off' });
    expect(ids(await enabledSources())).toEqual(['testsermons']);
  });
});

describe('useSermons asks again when a switch changes', () => {
  const place = { book: 'rom', chapter: 5, from: 8, to: 8 };
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
    registerTestSermons({ second: true });
  });
  afterEach(forgetTestSermons);
  // what the Settings row does, for a source of the tests' own (the registry holds the bundled sources only): save the switch and tell the bus
  const switchTo = (value: 'on' | 'off') =>
    act(async () => {
      await db.settings.put({ key: 'sermons.testsecond', value });
      publish({ kind: 'setting-changed', key: 'sermons.testsecond', value });
    });
  const count = (found: { here: unknown[]; chapter: unknown[] } | undefined): number | undefined => (found ? found.here.length + found.chapter.length : undefined);

  it('drops the rows of a source switched Off, and brings them back', async () => {
    const { result } = renderHook(() => useSermons(place));
    await waitFor(() => expect(count(result.current)).toBe(5));
    await switchTo('off');
    await waitFor(() => expect(count(result.current)).toBe(4));
    await switchTo('on');
    await waitFor(() => expect(count(result.current)).toBe(5));
  });
});
