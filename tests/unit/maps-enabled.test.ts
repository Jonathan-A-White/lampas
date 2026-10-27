// Which map sources are on (src/maps/enabled.ts, mw-zbjgn3r.6): the switches Settings > Study resources > Maps keep, and the Logos switch a source that needs it rides on.
// The pure function takes the sources and a reader of setting values; mapsFor (src/maps/index.ts) answers the cards of the enabled sources only.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { enabledSources, mapsFor, setMapSources, SOURCES } from '../../src/maps';
import { enabledSources as enabledOf } from '../../src/maps/enabled';
import { bibleMapper } from '../../src/maps/sources/biblemapper';
import type { MapSource } from '../../src/maps/types';
import { forgetTestMaps, linkSource, linkSourceNeedingLogos, registerTestMaps, testSource } from '../support/test-maps';

const reader = (values: Record<string, string>) => (key: string): string | undefined => values[key];
const ids = (sources: readonly MapSource[]): string[] => sources.map((s) => s.id);

describe('enabledSources (pure)', () => {
  const sources = [bibleMapper, linkSource];

  it('keeps every source whose switch is on, in the registry order', () => {
    expect(ids(enabledOf(sources, reader({ 'maps.biblemapper': 'on', 'maps.testlinks': 'on' })))).toEqual(['biblemapper', 'testlinks']);
  });

  it('leaves out a source whose switch is off', () => {
    expect(ids(enabledOf(sources, reader({ 'maps.biblemapper': 'off', 'maps.testlinks': 'on' })))).toEqual(['testlinks']);
    expect(ids(enabledOf(sources, reader({ 'maps.biblemapper': 'on', 'maps.testlinks': 'off' })))).toEqual(['biblemapper']);
  });

  it("takes a source's own default where nothing is saved", () => {
    expect(ids(enabledOf([bibleMapper, { ...linkSource, default: 'off' }], reader({})))).toEqual(['biblemapper']);
  });

  it('leaves out a source that needs Logos while resource.logos is off, whatever its own switch says', () => {
    const all = [bibleMapper, linkSourceNeedingLogos];
    expect(ids(enabledOf(all, reader({ 'maps.testlogos': 'on', 'resource.logos': 'off' })))).toEqual(['biblemapper']);
    expect(ids(enabledOf(all, reader({ 'maps.testlogos': 'on' })))).toEqual(['biblemapper']);
    expect(ids(enabledOf(all, reader({ 'maps.testlogos': 'on', 'resource.logos': 'on' })))).toEqual(['biblemapper', 'testlogos']);
    expect(ids(enabledOf(all, reader({ 'maps.testlogos': 'off', 'resource.logos': 'on' })))).toEqual(['biblemapper']);
  });
});

describe('mapsFor honours the switches', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
    registerTestMaps();
    setMapSources([testSource, linkSource, linkSourceNeedingLogos]);
  });
  afterEach(forgetTestMaps);
  const ref = { book: 'gen', chapter: 10, from: 19, to: 19 };
  const sourcesOf = async (): Promise<string[]> => [...new Set((await mapsFor(ref)).map((c) => c.source))];

  it('answers both sources, Bible Mapper first, by default (Logos off hides the one that needs it)', async () => {
    expect(await sourcesOf()).toEqual(['biblemapper', 'testlinks']);
    expect(ids(await enabledSources())).toEqual(['biblemapper', 'testlinks']);
  });

  it("answers the second source's cards alone with Bible Mapper off", async () => {
    await db.settings.put({ key: 'maps.biblemapper', value: 'off' });
    expect(await sourcesOf()).toEqual(['testlinks']);
  });

  it('answers a source that needs Logos only while Logos is on', async () => {
    await db.settings.put({ key: 'maps.testlogos', value: 'on' });
    expect(await sourcesOf()).toEqual(['biblemapper', 'testlinks']);
    await db.settings.put({ key: 'resource.logos', value: 'on' });
    expect(await sourcesOf()).toEqual(['biblemapper', 'testlinks', 'testlogos']);
  });

  it('answers nothing where every source is off', async () => {
    await db.settings.bulkPut([
      { key: 'maps.biblemapper', value: 'off' },
      { key: 'maps.testlinks', value: 'off' },
    ]);
    expect(await mapsFor(ref)).toEqual([]);
  });
});

describe('the registry of sources (mw-zbjgn3r.7)', () => {
  it('has Bible Mapper, then the Logos Atlas, which is used only while Logos is on', () => {
    expect(ids(SOURCES)).toEqual(['biblemapper', 'logosatlas']);
    expect(ids(enabledOf(SOURCES, reader({})))).toEqual(['biblemapper']);
    expect(ids(enabledOf(SOURCES, reader({ 'resource.logos': 'off' })))).toEqual(['biblemapper']);
    expect(ids(enabledOf(SOURCES, reader({ 'resource.logos': 'on' })))).toEqual(['biblemapper', 'logosatlas']);
    expect(ids(enabledOf(SOURCES, reader({ 'resource.logos': 'on', 'maps.logosatlas': 'off' })))).toEqual(['biblemapper']);
  });
});
