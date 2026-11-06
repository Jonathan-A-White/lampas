// src/sermons/sermonsFor.ts and src/sermons/enabled.ts (mw-qtu3zvz.2, docs/sermons.md 'Which sermons are for this verse'): the rows of a chapter, those whose preaching text overlaps the verse
// or passage first (narrower first), the rest of the chapter after them in the source's order, the sources in the registry's order; and which sources are in use.
import { afterEach, describe, expect, it } from 'vitest';
import { enabledSources as enabledOf, sourceKey } from '../../src/sermons/enabled';
import { overlaps, sermonsForSources } from '../../src/sermons/sermonsFor';
import type { SermonRow } from '../../src/sermons/types';
import { forgetTestSermons, offSource, secondSource, testSource } from '../support/test-sermons';
import { enabledSources, sermonsFor, SOURCES } from '../../src/sermons';
import { registerTestSermons } from '../support/test-sermons';

const ids = (rows: readonly SermonRow[]): string[] => rows.map((r) => r.id);
const sources = [testSource, secondSource];

describe('overlaps', () => {
  const adam: SermonRow['ref'] = { book: 'rom', chapter: 5, from: 12, to: 4, toChapter: 6 };
  it('is true for a verse inside the text, its ends and a passage across it', () => {
    const peace: SermonRow['ref'] = { book: 'rom', chapter: 5, from: 1, to: 11 };
    expect(overlaps(peace, 5, 1, 1)).toBe(true);
    expect(overlaps(peace, 5, 11, 11)).toBe(true);
    expect(overlaps(peace, 5, 8, 8)).toBe(true);
    expect(overlaps(peace, 5, 10, 14)).toBe(true);
    expect(overlaps(peace, 5, 12, 21)).toBe(false);
    expect(overlaps(peace, 6, 1, 1)).toBe(false);
  });
  it('follows a text into the next chapter', () => {
    expect(overlaps(adam, 5, 20, 20)).toBe(true);
    expect(overlaps(adam, 6, 4, 4)).toBe(true);
    expect(overlaps(adam, 6, 5, 5)).toBe(false);
    expect(overlaps(adam, 5, 11, 11)).toBe(false);
  });
});

describe('sermonsForSources', () => {
  it('puts the rows that overlap a verse first, narrower first within each source, then the rest of the chapter in the source’s order', async () => {
    const found = await sermonsForSources(sources, { book: 'rom', chapter: 5, from: 8, to: 8 });
    expect(ids(found.here)).toEqual(['love', 'peace', 'shown']);
    expect(ids(found.chapter)).toEqual(['reign', 'adam']);
  });

  it('leads with the narrower text where two overlap a passage', async () => {
    const found = await sermonsForSources(sources, { book: 'rom', chapter: 5, from: 12, to: 14 });
    expect(ids(found.here)).toEqual(['reign', 'adam']);
    expect(ids(found.chapter)).toEqual(['peace', 'love', 'shown']);
  });

  it('gives a whole chapter every row as the chapter’s, in the registry’s order of sources and the source’s order', async () => {
    const found = await sermonsForSources(sources, { book: 'rom', chapter: 5 });
    expect(found.here).toEqual([]);
    expect(ids(found.chapter)).toEqual(['peace', 'love', 'reign', 'adam', 'shown']);
  });

  it('finds a text that runs on into the chapter asked for', async () => {
    const found = await sermonsForSources(sources, { book: 'rom', chapter: 6, from: 2, to: 2 });
    expect(ids(found.here)).toEqual(['adam']);
    expect(found.chapter).toEqual([]);
  });

  it('has no row here where the verse is past every text, and still lists the chapter', async () => {
    const found = await sermonsForSources(sources, { book: 'jon', chapter: 1, from: 11, to: 11 });
    expect(found.here).toEqual([]);
    expect(ids(found.chapter)).toEqual(['run', 'storm']);
  });

  it('answers nothing for a chapter with no sermons and for no sources', async () => {
    expect(await sermonsForSources(sources, { book: 'rom', chapter: 9, from: 1, to: 1 })).toEqual({ here: [], chapter: [] });
    expect(await sermonsForSources([], { book: 'rom', chapter: 5 })).toEqual({ here: [], chapter: [] });
  });

  it('keeps the sources in the order given', async () => {
    const found = await sermonsForSources([secondSource, testSource], { book: 'rom', chapter: 5, from: 8, to: 8 });
    expect(ids(found.here)).toEqual(['shown', 'love', 'peace']);
  });
});

describe('enabledSources (pure)', () => {
  const read = (values: Record<string, string>) => (key: string): string | undefined => values[key];
  const names = (list: readonly { id: string }[]): string[] => list.map((s) => s.id);

  it('keys a switch as sermons.<id>', () => {
    expect(sourceKey(testSource)).toBe('sermons.testsermons');
  });
  it('keeps the sources whose switch is on, and takes the source’s own default where nothing is saved', () => {
    expect(names(enabledOf([testSource, offSource], read({})))).toEqual(['testsermons']);
    expect(names(enabledOf([testSource, offSource], read({ 'sermons.testoff': 'on', 'sermons.testsermons': 'off' })))).toEqual(['testoff']);
  });
  it('leaves out a source that needs Logos until Logos is on', () => {
    const logos = { ...secondSource, id: 'testlogos', needs: 'logos' as const };
    expect(names(enabledOf([testSource, logos], read({})))).toEqual(['testsermons']);
    expect(names(enabledOf([testSource, logos], read({ 'resource.logos': 'on' })))).toEqual(['testsermons', 'testlogos']);
  });
});

describe('the registry', () => {
  afterEach(forgetTestSermons);

  it('registers the bundled sources, which are all on', async () => {
    expect(SOURCES.map((s) => s.id)).toEqual(['spurgeon-ccel', 'henry-sermons']);
    expect((await enabledSources()).map((s) => s.id)).toEqual(['spurgeon-ccel', 'henry-sermons']);
  });

  it('answers a place from the sources in use only', async () => {
    registerTestSermons({ off: true });
    expect(await sermonsFor({ book: 'rom', chapter: 5, from: 8, to: 8 })).toEqual({ here: [], chapter: [] });
    registerTestSermons({ second: true });
    expect(ids((await sermonsFor({ book: 'rom', chapter: 5, from: 8, to: 8 })).here)).toEqual(['love', 'peace', 'shown']);
  });
});
