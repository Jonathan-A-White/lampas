// The maps the Bible talk tells the tutor (mw-zbjgn3r.4, src/maps/forTutor.ts): the cards of the passage's chapter as {id, title, period, places}, at most 12, the places
// being the names of the card that the held verse or range speaks, and nothing sent when the talk holds no passage.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { MAX_TUTOR_MAPS, mapsForTutor } from '../../src/maps/forTutor';
import { period } from '../../src/maps/period';
import type { MapCard } from '../../src/maps/types';
import { buildTalkRequest } from '../../src/services/talk';
import { dropMaps } from '../../src/services/talkFit';
import { TEST_CARDS } from '../support/test-maps';

const card = (id: string, title: string, places: string[] = [], kind: MapCard['kind'] = 'event'): MapCard => ({ id, source: 'biblemapper', title, kind, period: period(-2100, -2090), article: `https://biblemapper.com/blog/${id}/`, places });
const sodom = card('SodomAndGomorrah', 'Sodom and Gomorrah Are Destroyed', ['Admah?', 'Arad', 'Hazazon-tamar? (En-gedi)', 'Gomorrah?', 'Hebron', 'Jericho (OT)', 'Sodom?', 'Zeboiim?', 'Zoar', 'Dead Sea']);
const verse19 = 'and the border of the Canaanites was from Sidon, as thou comest to Gerar, unto Gaza; as thou goest, unto Sodom, and Gomorrah, and Admah, and Zeboiim, even unto Lasha.';

describe('mapsForTutor', () => {
  it('gives id, title, period and places for each card', () => {
    const [one] = mapsForTutor([sodom], verse19);
    expect(one).toEqual({ id: 'SodomAndGomorrah', title: 'Sodom and Gomorrah Are Destroyed', period: '2100 to 2090 BC', places: ['Sodom', 'Gomorrah', 'Admah', 'Zeboiim'] });
    expect(Object.keys(one)).toEqual(['id', 'title', 'period', 'places']);
  });

  it('names no place when the passage is a chapter (no text to match)', () => {
    expect(mapsForTutor([sodom])[0].places).toEqual([]);
  });

  it('puts the maps that speak the verse first, the rest in their order', () => {
    const ararat = card('Ararat', 'Ararat', ['Ararat']);
    const babel = card('TowerOfBabel', 'The Tower of Babel', ['Babel']);
    expect(mapsForTutor([ararat, babel, sodom], verse19).map((m) => m.id)).toEqual(['SodomAndGomorrah', 'Ararat', 'TowerOfBabel']);
  });

  it('leaves out a video, which a map link cannot open', () => {
    expect(mapsForTutor([card('Genesis_10', 'Genesis 10', [], 'video'), sodom]).map((m) => m.id)).toEqual(['SodomAndGomorrah']);
  });

  it('leaves out a link-only source\'s row, which opens in Logos and not in the map view', () => {
    const logos: MapCard = { ...card('JONAHSTRAVELS-EN', 'Logos Atlas: Jonah’s Travels', [], 'link'), source: 'logosatlas', open: { url: 'https://app.logos.com/tools/atlas/JONAHSTRAVELS-EN' } };
    expect(mapsForTutor([logos, sodom]).map((m) => m.id)).toEqual(['SodomAndGomorrah']);
  });

  it('holds at most 12', () => {
    const many = Array.from({ length: 20 }, (_, i) => card(`M${i}`, `Map ${i}`));
    expect(MAX_TUTOR_MAPS).toBe(12);
    expect(mapsForTutor(many)).toHaveLength(12);
  });
});

describe('the Bible talk request and its maps', () => {
  const gen10 = JSON.parse(readFileSync('public/data/gen/10.json', 'utf8')) as Chapter;
  const cards = TEST_CARDS['gen.10'].map((c) => (c.id === 'SodomAndGomorrah' ? { ...c, places: sodom.places } : c));

  it('carries maps when the talk holds a verse, with the places the verse names', () => {
    const request = buildTalkRequest({ title: 'Genesis 10', chapter: gen10, verse: gen10.verses.find((v) => v.n === 19)! }, 'is there a map of this?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, [], undefined, undefined, cards);
    expect(request.maps?.map((m) => m.id)).toEqual(['SodomAndGomorrah', 'TowerOfBabel', 'Mesopotamia', 'Ararat', 'TableOfNationsHam']);
    expect(request.maps?.[0].places).toEqual(['Sodom', 'Gomorrah', 'Admah', 'Zeboiim']);
    expect(request.maps?.[1].places).toEqual([]);
  });

  it('carries maps for a chapter talk with no places, and none when the chapter has no maps', () => {
    const chapterTalk = buildTalkRequest({ title: 'Genesis 10', chapter: gen10, verse: null }, 'what is here?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, [], undefined, undefined, cards);
    expect(chapterTalk.maps?.every((m) => m.places.length === 0)).toBe(true);
    const none = buildTalkRequest({ title: 'Genesis 10', chapter: gen10, verse: null }, 'what is here?', [], [], {});
    expect('maps' in none).toBe(false);
  });

  it('sends no field when the talk holds no passage (a talk from a screen)', () => {
    const screen = { name: 'Goal', facts: [] };
    const request = buildTalkRequest({ title: 'Goal', chapter: gen10, verse: null, screen }, 'what next?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, [], undefined, undefined, cards);
    expect('maps' in request).toBe(false);
  });
});

describe('the fit', () => {
  it('dropMaps takes the maps out of a request, and nothing when it has none', () => {
    const request = { reference: 'Genesis 10:19', question: 'q', history: [], solid_words: [], settings: {}, maps: mapsForTutor([sodom]) };
    expect('maps' in (dropMaps(request) ?? { maps: 1 })).toBe(false);
    expect(dropMaps({ ...request, maps: undefined })).toBeNull();
  });
});
