// The Logos Atlas as a map source (src/maps/sources/logosatlas.ts, mw-zbjgn3r.7): link-only rows, never a picture: the web atlas on the maps that cover the verse (or, where none does, on the base map
// centred on its places) and the Lexham Geographic Commentary at the passage, from his shelf.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setResourceOn, setState, type ShelfState } from '../../src/data/repositories';
import { mapsFor, setMapSources } from '../../src/maps';
import data from '../../src/maps/data/logosatlas.json';
import type { LogosAtlasIndex } from '../../src/maps/logosRef';
import { setPlaceLoader } from '../../src/maps/places';
import { logosAtlas, logosAtlasCards, PERIOD_NAMES, viewOf } from '../../src/maps/sources/logosatlas';
import type { MapRef, Place } from '../../src/maps/types';

const index = data as LogosAtlasIndex;
const place = (name: string, lat?: number, lng?: number, verses: [number, number][] = [[10, 19]]): Place => ({ id: `${name}@test`, name, names: [name], strongs: [], verses, ...(lat === undefined ? {} : { lat, lng }) });
// Genesis 10:19 as the tests' places hold it: three places with a position and one without
const GENESIS = [place('Gerar', 31.39129, 34.56057), place('Admah', 31.11942, 35.41253), place('Canaan'), place('Lasha', 31.71815, 35.58483)];
const LGC = 'LLS:LXGEOCOMMPENT';
const shelf = (state: ShelfState = 'on'): ReadonlyMap<string, ShelfState> => new Map([[LGC, state]]);
const ref = (book: string, chapter: number, from?: number, to?: number): MapRef => ({ book, chapter, ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }) });
const ATLAS = 'https://app.logos.com/tools/atlas/';

describe('viewOf', () => {
  it('centres on the mean of the places that have a position, and ignores the rest', () => {
    const view = viewOf([place('A', 30, 34), place('B', 32, 36), place('Nowhere')]);
    expect(view).toMatchObject({ lat: 31, lng: 35 });
  });

  it('answers nothing when no place has a position', () => {
    expect(viewOf([])).toBeUndefined();
    expect(viewOf([place('Nowhere')])).toBeUndefined();
  });

  it('zooms by the spread: 8 under 1 degree, 7 from 1 to 3, 6.36 over 3', () => {
    expect(viewOf([place('A', 31, 35), place('B', 31.5, 35.5)])?.zoom).toBe(8);
    expect(viewOf([place('A', 31, 35)])?.zoom).toBe(8);
    expect(viewOf([place('A', 31, 35), place('B', 32, 35)])?.zoom).toBe(7);
    expect(viewOf([place('A', 31, 35), place('B', 31, 38)])?.zoom).toBe(7);
    expect(viewOf([place('A', 31, 35), place('B', 34.5, 35)])?.zoom).toBe(6.36);
    expect(viewOf([place('A', 31, 30), place('B', 31, 35)])?.zoom).toBe(6.36);
  });
});

describe('logosAtlasCards, Row A: the atlas', () => {
  it("answers one card per map that covers the verse, 'Logos Atlas: <title>', Jonah's own map first", () => {
    const cards = logosAtlasCards(ref('jon', 1, 1), [], new Map(), index);
    expect(cards.map((c) => c.title)).toEqual(['Logos Atlas: Jonah’s Travels', 'Logos Atlas: Biblical World — Divided Kingdom']);
    expect(cards.map((c) => c.id)).toEqual(['JONAHSTRAVELS-EN', 'BIBLICALWORLDDIVIDEDKINGDOM-EN']);
    expect(cards.map((c) => c.period)).toEqual(['Divided Kingdom', 'Divided Kingdom']);
    for (const c of cards) expect(c).toMatchObject({ source: 'logosatlas', kind: 'link', places: [] });
  });

  it('opens the bare map when the verse has no place with a position', () => {
    const [card] = logosAtlasCards(ref('jon', 1, 1), [place('Joppa')], new Map(), index);
    expect(card.open).toEqual({ url: `${ATLAS}JONAHSTRAVELS-EN` });
    expect(card.article).toBe(`${ATLAS}JONAHSTRAVELS-EN`);
  });

  it('opens the map centred on the places when the verse has some', () => {
    const [card] = logosAtlasCards(ref('jon', 1, 1), [place('Nineveh', 36.3590123, 43.1530987, [[1, 2]]), place('Joppa')], new Map(), index);
    expect(card.open).toEqual({ url: `${ATLAS}JONAHSTRAVELS-EN?zoom=8&style=terrain&lat=36.3590&lng=43.1531&layout=one` });
    expect(card.places).toEqual(['Nineveh']);
  });

  it('answers at most three maps', () => {
    const many = { ...index, maps: [1, 2, 3, 4].map((n) => ({ id: `M${n}-EN`, title: `Map ${n}`, period: 'judgesera', order: n, passages: ['bible.1.1.1'] })) };
    expect(logosAtlasCards(ref('gen', 1, 1), [], new Map(), many)).toHaveLength(3);
  });

  it("falls back to the base map centred on the verse's places when no map covers it", () => {
    const cards = logosAtlasCards(ref('gen', 10, 19), GENESIS, new Map(), index);
    expect(cards).toHaveLength(1);
    const view = viewOf(GENESIS);
    expect(cards[0].title).toBe('Logos Atlas at Gerar, Admah, Lasha');
    expect(cards[0].places).toEqual(['Gerar', 'Admah', 'Lasha']);
    expect(cards[0].kind).toBe('link');
    expect(cards[0].open?.url).toBe(`${ATLAS}BIBLICALWORLDPREPATRIARCHALPERIOD-EN?zoom=${view?.zoom}&style=terrain&lat=${view?.lat.toFixed(4)}&lng=${view?.lng.toFixed(4)}&layout=one`);
    expect(cards[0].open?.fallback).toBeUndefined();
  });

  it('names the first three places and counts the rest', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((n, i) => place(n, 31 + i / 10, 35));
    expect(logosAtlasCards(ref('gen', 10, 19), six, new Map(), index)[0].title).toBe('Logos Atlas at A, B, C and 3 more');
  });

  it('names the places of a whole chapter in one line', () => {
    const cards = logosAtlasCards(ref('gen', 10), GENESIS, new Map(), index);
    expect(cards.map((c) => c.title)).toEqual(['Logos Atlas at the places of Genesis 10']);
  });

  it('answers no atlas row for a verse with neither a map nor a place with a position', () => {
    expect(logosAtlasCards(ref('gen', 10, 19), [place('Canaan')], new Map(), index)).toEqual([]);
    expect(logosAtlasCards(ref('gen', 10, 19), [], new Map(), index)).toEqual([]);
  });

  it('gives every period of the index a name', () => {
    for (const slug of index.periods) expect(PERIOD_NAMES[slug], slug).toBeTruthy();
  });
});

describe('logosAtlasCards, Row B: the Lexham Geographic Commentary', () => {
  const lgc = (r: MapRef, states = shelf()) => logosAtlasCards(r, GENESIS, states, index).filter((c) => c.title.startsWith('Lexham'));

  it('opens the Pentateuch volume at the verse when it is On', () => {
    expect(lgc(ref('gen', 10, 19))).toEqual([
      expect.objectContaining({
        id: 'LLS:LXGEOCOMMPENT',
        source: 'logosatlas',
        title: 'Lexham Geographic Commentary on the Pentateuch at Genesis 10:19',
        kind: 'link',
        period: 'Opens in Logos',
        open: { url: 'logosres:lxgeocommpent;ref=Bible.Ge10.19', fallback: 'https://ref.ly/logosres/lxgeocommpent?ref=Bible.Ge10.19' },
      }),
    ]);
  });

  it('opens at the first verse of a range, and names the range', () => {
    const [card] = lgc(ref('gen', 10, 1, 19));
    expect(card.title).toBe('Lexham Geographic Commentary on the Pentateuch at Genesis 10:1-19');
    expect(card.open?.url).toBe('logosres:lxgeocommpent;ref=Bible.Ge10.1');
  });

  it('opens at the chapter for a whole chapter', () => {
    const [card] = lgc(ref('gen', 10));
    expect(card.title).toBe('Lexham Geographic Commentary on the Pentateuch at Genesis 10');
    expect(card.open?.url).toBe('logosres:lxgeocommpent;ref=Bible.Ge10');
  });

  it('is also there when the volume is Pinned, and gone when it is Off or not on the shelf', () => {
    expect(lgc(ref('gen', 10, 19), shelf('pinned'))).toHaveLength(1);
    expect(lgc(ref('gen', 10, 19), shelf('off'))).toEqual([]);
    expect(lgc(ref('gen', 10, 19), new Map())).toEqual([]);
  });

  it('is left out for a book no volume covers', () => {
    expect(lgc(ref('est', 1, 1))).toEqual([]);
  });

  it('opens the Gospels volume for Matthew and the Acts to Revelation volume for Romans', () => {
    const states = new Map<string, ShelfState>([['LLS:LXGEOCOMMGOSP', 'on'], ['LLS:LXGEOCOMMACT7', 'on']]);
    expect(logosAtlasCards(ref('mat', 12, 41), [], states, index).map((c) => c.open?.url)).toEqual(['https://app.logos.com/tools/atlas/BIBLICALWORLDLIFEOFJESUS-EN', 'logosres:lxgeocommgosp;ref=Bible.Mt12.41']);
    expect(logosAtlasCards(ref('rom', 8, 1), [], states, index).map((c) => c.open?.url)).toEqual(['logosres:lxgeocommact7;ref=Bible.Ro8.1']);
  });

  it("holds the Pentateuch volume to the Psalms it covers, 78 to 105", () => {
    expect(lgc(ref('psa', 147, 2))).toEqual([]);
    expect(lgc(ref('psa', 78, 1)).map((c) => c.id)).toEqual([LGC]);
    expect(lgc(ref('psa', 105, 1)).map((c) => c.id)).toEqual([LGC]);
    expect(lgc(ref('psa', 106, 1))).toEqual([]);
  });

  it('answers one volume only for a book two volumes cover (Galatians)', () => {
    const states = new Map<string, ShelfState>([[LGC, 'on'], ['LLS:LXGEOCOMMACT7', 'on']]);
    expect(lgc(ref('gal', 3, 1), states)).toHaveLength(1);
  });
});

describe('logosAtlas, the source', () => {
  it('is Logos Atlas, rides on Logos, starts On and has no picture', () => {
    expect(logosAtlas).toMatchObject({ id: 'logosatlas', name: 'Logos Atlas', needs: 'logos', default: 'on', homepage: 'https://www.logos.com/features/atlas' });
    expect(logosAtlas.credit).toBe('Logos Atlas and the Lexham Geographic Commentary, Faithlife; opens in your own Logos');
    expect(logosAtlas.imageUrl({} as never, 'low')).toBeNull();
    expect(logosAtlas.imageUrl({} as never, 'high')).toBeNull();
  });

  describe('mapsFor', () => {
    beforeEach(async () => {
      await db.open();
      await db.library.clear();
      setMapSources([logosAtlas]);
      setPlaceLoader(async () => GENESIS);
    });
    afterEach(() => {
      setMapSources(undefined);
      setPlaceLoader(undefined);
    });

    it('reads the places, the shelf and the index: the atlas row and the commentary row', async () => {
      await db.settings.clear();
      await setResourceOn('logos', true);
      await setState(LGC, 'on');
      expect((await mapsFor(ref('gen', 10, 19))).map((c) => c.title)).toEqual(['Logos Atlas at Gerar, Admah, Lasha', 'Lexham Geographic Commentary on the Pentateuch at Genesis 10:19']);
    });

    it('answers nothing while Logos is Off', async () => {
      await db.settings.clear();
      expect(await mapsFor(ref('gen', 10, 19))).toEqual([]);
    });
  });
});
