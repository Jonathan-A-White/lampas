// src/maps: a verse's or a passage's places rank the chapter's maps (mapsFor, rankByPlaces, placeNames.ts; docs/maps.md 'Which maps are for this verse').
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapsFor } from '../../src/maps';
import { rankByPlaces } from '../../src/maps/mapsFor';
import { loosePlaceName, matchedPlaceNames, normalPlaceName } from '../../src/maps/placeNames';
import { setPlaceLoader } from '../../src/maps/places';
import type { MapCard, Place } from '../../src/maps/types';

const place = (name: string, ...more: string[]): Place => ({ id: `${name}@Gen.1.1`, name, names: [name, ...more], strongs: [], verses: [[1, 1]] });
const card = (id: string, ...places: string[]): MapCard => ({ id, source: 'test', title: id, kind: 'event', period: '', article: '', places });
const ids = (cards: MapCard[]) => cards.map((c) => c.id);

describe('a place name, compared', () => {
  it('is lower case, without accents, a bracketed or parenthesised suffix or a trailing question mark', () => {
    expect(normalPlaceName('Bethel [al-Bira]')).toBe('bethel');
    expect(normalPlaceName('Jericho (OT)')).toBe('jericho');
    expect(normalPlaceName('Pharpar River?')).toBe('pharpar river');
    expect(normalPlaceName('Sepphóris')).toBe('sepphoris');
    expect(normalPlaceName('Abel-beth-maacah')).toBe('abel beth maacah');
  });

  it('matches Bethel and Jericho through their brackets, and Hermon through Mount Hermon', () => {
    const passage = [place('Bethel'), place('Jericho'), place('Hermon')];
    expect(matchedPlaceNames(['Bethel [al-Bira]', 'Jericho (OT)', 'Mount Hermon'], passage)).toEqual(['Bethel', 'Jericho', 'Hermon']);
    expect(matchedPlaceNames(['Hermon'], [place('Mount Hermon')])).toEqual(['Mount Hermon']);
    expect(matchedPlaceNames(['Jordan River'], [place('Jordan')])).toEqual(['Jordan']);
  });

  it('matches Sea of Galilee to Galilee only when nothing of the passage is named Sea of Galilee', () => {
    expect(loosePlaceName('Sea of Galilee')).toBe('galilee');
    expect(matchedPlaceNames(['Sea of Galilee'], [place('Galilee')])).toEqual(['Galilee']);
    expect(matchedPlaceNames(['Sea of Galilee'], [place('Galilee'), place('Chinnereth', 'Sea of Galilee')])).toEqual(['Chinnereth']);
  });

  it('answers the passage\'s own names, in the passage\'s order, once, and none for a map with no places', () => {
    const passage = [place('Sidon'), place('Gerar'), place('Sodom', 'Sodom')];
    expect(matchedPlaceNames(['Sodom', 'Sidon', 'Sodom'], passage)).toEqual(['Sidon', 'Sodom']);
    expect(matchedPlaceNames([], passage)).toEqual([]);
    expect(matchedPlaceNames(['Sodom'], [])).toEqual([]);
  });

  it('finds a place by any of its other forms', () => {
    expect(matchedPlaceNames(['Zidon'], [place('Sidon', 'Zidon')])).toEqual(['Sidon']);
  });
});

describe('rankByPlaces', () => {
  const cards = [card('none', 'Ur'), card('one', 'Sidon'), card('two', 'Sodom', 'Admah'), card('alsoOne', 'Gerar'), card('video')];
  const passage = [place('Sidon'), place('Gerar'), place('Sodom'), place('Admah')];

  it('puts the maps that show a place first, the most places first, then in the source\'s order, each with the places it shows', () => {
    const ranked = rankByPlaces(cards, passage);
    expect(ids(ranked)).toEqual(['two', 'one', 'alsoOne', 'none', 'video']);
    expect(ranked.map((c) => c.matched)).toEqual([['Sodom', 'Admah'], ['Sidon'], ['Gerar'], [], []]);
  });

  it('keeps the order for a whole chapter, and every matched empty', () => {
    const ranked = rankByPlaces(cards, undefined);
    expect(ids(ranked)).toEqual(ids(cards));
    expect(ranked.every((c) => c.matched?.length === 0)).toBe(true);
  });

  it('keeps the source\'s order when the passage has no places', () => {
    expect(ids(rankByPlaces(cards, []))).toEqual(ids(cards));
  });
});

describe('mapsFor on the real Genesis 10', () => {
  afterEach(() => {
    setPlaceLoader(undefined);
    vi.restoreAllMocks();
  });

  it('leads Genesis 10:19 with Sodom and Gomorrah, matched on the four cities, then the Table of Nations maps that show its places', async () => {
    const cards = await mapsFor({ book: 'gen', chapter: 10, from: 19 });
    expect(ids(cards).slice(0, 3)).toEqual(['SodomAndGomorrah', 'TableOfNationsHam', 'TableOfNationsShem']);
    expect(cards[0].matched).toEqual(['Sodom', 'Gomorrah', 'Admah', 'Zeboiim']);
    expect(cards[1].matched).toEqual(expect.arrayContaining(['Sidon', 'Gerar', 'Sodom']));
    expect(cards[2].matched).toContain('Sidon');
    expect(new Set(ids(cards))).toEqual(new Set(['Mesopotamia', 'Ararat', 'SodomAndGomorrah', 'TableOfNationsHam', 'TableOfNationsShem', 'TableOfNationsJapheth']));
    expect(cards.filter((c) => c.matched?.length === 0).map((c) => c.id)).toEqual(['Mesopotamia', 'Ararat', 'TableOfNationsJapheth']); // the rest, in Bible Mapper's order
  });

  it('ranks a passage by all of its verses', async () => {
    const cards = await mapsFor({ book: 'gen', chapter: 10, from: 8, to: 19 });
    expect(cards[0].matched?.length).toBeGreaterThan(0);
    expect(cards.map((c) => c.matched?.length ?? 0)).toEqual([...cards.map((c) => c.matched?.length ?? 0)].sort((a, b) => b - a));
  });

  it('keeps Bible Mapper\'s order for the whole of Genesis 10, with nothing matched', async () => {
    const cards = await mapsFor({ book: 'gen', chapter: 10 });
    expect(ids(cards)).toEqual(['Mesopotamia', 'Ararat', 'SodomAndGomorrah', 'TableOfNationsHam', 'TableOfNationsShem', 'TableOfNationsJapheth']);
    expect(cards.every((c) => Array.isArray(c.matched) && c.matched.length === 0)).toBe(true);
  });

  it('keeps the chapter\'s order when the places cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setPlaceLoader(async () => {
      throw new Error('offline');
    });
    const cards = await mapsFor({ book: 'gen', chapter: 10, from: 19 });
    expect(ids(cards)).toEqual(['Mesopotamia', 'Ararat', 'SodomAndGomorrah', 'TableOfNationsHam', 'TableOfNationsShem', 'TableOfNationsJapheth']);
  });
});
