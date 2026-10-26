// src/maps/index.ts: mapsFor answers a chapter's maps from the registered sources, from the committed src/maps/data/biblemapper.json.
import { describe, expect, it } from 'vitest';
import { statSync } from 'node:fs';
import { mapsFor, SOURCES } from '../../src/maps';
import { mapsForSources, rankPerSource } from '../../src/maps/mapsFor';
import type { MapCard, MapSource } from '../../src/maps/types';
import { bibleMapper } from '../../src/maps/sources/biblemapper';

describe('Bible Mapper, the first source', () => {
  it('is the only registered source, with the credit and the homepage the site asks for', () => {
    expect(SOURCES).toEqual([bibleMapper]);
    expect(bibleMapper.id).toBe('biblemapper');
    expect(bibleMapper.name).toBe('Bible Mapper');
    expect(bibleMapper.credit).toBe('Map by David P. Barrett, biblemapper.com');
    expect(bibleMapper.homepage).toBe('https://biblemapper.com');
  });

  it('keeps the compacted file under 150 KB', () => {
    expect(statSync('src/maps/data/biblemapper.json').size).toBeLessThan(150_000);
  });
});

describe('mapsFor', () => {
  it('answers Genesis 10 with six cards led by Mesopotamia', async () => {
    const cards = await mapsFor({ book: 'gen', chapter: 10 });
    expect(cards.map((c) => c.id)).toEqual(['Mesopotamia', 'Ararat', 'SodomAndGomorrah', 'TableOfNationsHam', 'TableOfNationsShem', 'TableOfNationsJapheth']);
    expect(cards[0]).toMatchObject({ source: 'biblemapper', title: expect.any(String), kind: 'region', period: '', article: expect.stringContaining('https://biblemapper.com/blog/') });
    expect(cards[0].places).toContain('Babylon');
  });

  it('answers Acts 27 with its voyage maps first, dated AD 60, and the audio-visual reading last', async () => {
    const cards = await mapsFor({ book: 'act', chapter: 27 });
    expect(cards.map((c) => c.id).slice(0, 2)).toEqual(['PaulsVoyageToRome', 'Calendar']);
    expect(cards.map((c) => c.id)).toContain('MaltaSicilyItaly');
    expect(cards[0]).toMatchObject({ kind: 'event', start: 60, end: 60, period: 'AD 60' });
    const last = cards[cards.length - 1];
    expect(last).toMatchObject({ id: 'Acts_27', kind: 'video', video: true });
    expect(cards.slice(0, -1).every((c) => c.video === undefined)).toBe(true);
  });

  it('answers [] for a chapter with no maps, and for a book Bible Mapper does not cover', async () => {
    expect(await mapsFor({ book: 'gen', chapter: 1000 })).toEqual([]);
    expect(await mapsFor({ book: 'xyz', chapter: 1 })).toEqual([]);
  });

  it('answers the same maps for a verse that names none of their places: the source maps by the chapter', async () => {
    expect((await mapsFor({ book: 'gen', chapter: 10, from: 5, to: 7 })).map((c) => c.id)).toEqual((await mapsFor({ book: 'gen', chapter: 10 })).map((c) => c.id));
  });

  it('puts a second source\'s cards after the first\'s', async () => {
    const extra: MapCard = { id: 'atlas-1', source: 'fake', title: 'A fake atlas page', kind: 'region', period: '', article: 'https://example.org/atlas', places: [] };
    const fake: MapSource = {
      id: 'fake', name: 'Fake Atlas', homepage: 'https://example.org', credit: 'Fake atlas', describe: 'A fake atlas.', default: 'on',
      mapsFor: async () => [extra],
      imageUrl: () => null,
    };
    const cards = await mapsForSources([bibleMapper, fake], { book: 'gen', chapter: 10 });
    expect(cards.length).toBe(7);
    expect(cards[0].id).toBe('Mesopotamia');
    expect(cards[6]).toBe(extra);
  });
});

describe('the sources\' fields', () => {
  it('fills Bible Mapper\'s: a line for its Settings row, On by default, needing no study resource', () => {
    expect(bibleMapper.describe).not.toBe('');
    expect(bibleMapper.default).toBe('on');
    expect(bibleMapper.needs).toBeUndefined();
  });

  it('ranks the cards within a source: a link-only source\'s cards, which name places, do not outrank a map\'s', () => {
    const place = { id: 'p', name: 'Babylon', names: ['Babylon'], strongs: [], verses: [[10, 10]] as [number, number][] };
    const map: MapCard = { id: 'a', source: 'one', title: 'A', kind: 'region', period: '', article: '', places: ['Babylon'] };
    const quiet: MapCard = { id: 'b', source: 'one', title: 'B', kind: 'region', period: '', article: '', places: [] };
    const link: MapCard = { id: 'c', source: 'two', title: 'C', kind: 'link', period: '', article: '', places: ['Babylon', 'Babel'], open: { url: 'https://example.org/c' } };
    expect(rankPerSource([quiet, map, link], [place]).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('the images', () => {
  it('gives the low-res file from biblemapper.com, and null for the sizes it does not serve', async () => {
    const [card] = await mapsFor({ book: 'gen', chapter: 10 });
    expect(bibleMapper.imageUrl(card, 'low')).toBe('https://biblemapper.com/blog/images/lo-res/Mesopotamia_low.jpg');
    expect(bibleMapper.imageUrl(card, 'medium')).toBeNull();
    expect(bibleMapper.imageUrl(card, 'high')).toBeNull();
  });

  it('gives a video no image', async () => {
    const cards = await mapsFor({ book: 'act', chapter: 27 });
    const video = cards.find((c) => c.kind === 'video');
    expect(video).toBeDefined();
    expect(bibleMapper.imageUrl(video as MapCard, 'low')).toBeNull();
  });
});
