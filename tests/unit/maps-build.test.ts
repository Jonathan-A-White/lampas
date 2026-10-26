// scripts/maps-build.ts and scripts/maps/biblemapper.ts on small real cuts of Bible Mapper's two files (tests/fixtures/maps/); never the network.
// The cuts hold Genesis 10, Acts 27, Jeremiah 1 and Nahum 2 as the site lists them; the Tobit entry in the reference slice is made up, to prove the Apocrypha is dropped.
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { MAP_LIST_URL, MAP_REF_LIST_URL, runMapsBuild } from '../../scripts/maps-build';
import { parseBibleMapper } from '../../scripts/maps/biblemapper';
import { mapIdsOf } from '../../src/maps/sources/biblemapper';
import type { BibleMapperData } from '../../src/maps/types';

const list = readFileSync('tests/fixtures/maps/MapList-slice.json', 'utf8');
const refs = readFileSync('tests/fixtures/maps/MapRefList-slice.json', 'utf8');

function parse(): { data: BibleMapperData; warnings: string[] } {
  const warnings: string[] = [];
  const data = parseBibleMapper(list, refs, (line) => warnings.push(line));
  return { data, warnings };
}

describe('the fixtures are cuts, not books', () => {
  it('are each under 20 KB', () => {
    expect(statSync('tests/fixtures/maps/MapList-slice.json').size).toBeLessThan(20_000);
    expect(statSync('tests/fixtures/maps/MapRefList-slice.json').size).toBeLessThan(20_000);
  });
});

describe('parseBibleMapper: the maps', () => {
  const { data } = parse();

  it('keys the maps by basename, in order, and numbers them by that order for the chapters', () => {
    expect(data.ids).toEqual([...data.ids].sort());
    expect(Object.keys(data.maps)).toEqual(data.ids);
    expect(data.ids).toContain('PaulsVoyageToRome');
  });

  it('gives a region its kind, article, image file names with their width, and no dates when the source has none', () => {
    expect(data.maps.Mesopotamia).toMatchObject({
      title: expect.any(String),
      kind: 'region',
      article: expect.stringMatching(/^https:\/\/biblemapper\.com\/blog\//),
      image: { low: 'Mesopotamia_low.jpg', medium: 'Mesopotamia.jpg', high: 'Mesopotamia_high.jpg', width: 6.57 },
    });
    expect('start' in data.maps.Mesopotamia).toBe(false);
    expect('end' in data.maps.Mesopotamia).toBe(false);
  });

  it('reads the years as integers, negative for BC, only where the source gives them', () => {
    expect(data.maps.PaulsVoyageToRome).toMatchObject({ start: 60, end: 60, kind: 'event' });
    expect(data.maps.TableOfNationsShem.start).toBeUndefined();
    const dated = Object.values(data.maps).filter((m) => m.start !== undefined);
    for (const m of dated) expect(Number.isInteger(m.start)).toBe(true);
  });

  it('lists the places of the map, once each, from the image\'s locationIDs', () => {
    const places = data.maps.PaulsVoyageToRome.places;
    expect(places).toContain('Rome');
    expect(new Set(places).size).toBe(places.length);
  });

  it('keeps a video as a video, with its file name, no image and no places', () => {
    expect(data.maps.Acts_27).toMatchObject({ kind: 'video', video: 'Acts_27.mp4', places: [] });
    expect(data.maps.Acts_27.image).toBeUndefined();
  });
});

describe('parseBibleMapper: the chapters', () => {
  const { data, warnings } = parse();

  it('answers Genesis 10 with its six maps in the site\'s order', () => {
    expect(mapIdsOf(data, 'gen', 10)).toEqual(['Mesopotamia', 'Ararat', 'SodomAndGomorrah', 'TableOfNationsHam', 'TableOfNationsShem', 'TableOfNationsJapheth']);
  });

  it('answers Acts 27 with its voyage maps, then its audio-visual reading', () => {
    expect(mapIdsOf(data, 'act', 27)).toEqual(['PaulsVoyageToRome', 'Calendar', 'LyciaPamphylia', 'CreteCyreneSyrtis', 'MaltaSicilyItaly', 'CarthageMaltaSicily', 'Acts_27']);
  });

  it('keys the chapters by the app\'s book code, in canon order', () => {
    expect(Object.keys(data.chapters)).toEqual(['gen', 'jer', 'act']);
  });

  it('drops a basename no map in the list has, and warns', () => {
    expect(mapIdsOf(data, 'jer', 1)).toEqual(['Benjamin', 'ExileToBabylon']);
    expect(warnings).toEqual([
      expect.stringContaining('JudahAlone'),
      expect.stringContaining('Mesoptamia'),
    ]);
    expect(warnings[0]).toContain('Jeremiah 1');
    expect(warnings[1]).toContain('Nahum 2');
  });

  it('leaves out a chapter that has no map left', () => {
    expect(data.chapters.nam).toBeUndefined();
  });

  it('drops a book that is not one of the 66 (the Apocrypha)', () => {
    expect(JSON.stringify(data)).not.toContain('Tobit');
    expect(Object.keys(data.chapters).every((code) => ['gen', 'jer', 'act'].includes(code))).toBe(true);
  });

  it('names a map the chapters use and the list lacks nowhere', () => {
    for (const chapters of Object.values(data.chapters)) for (const numbers of Object.values(chapters)) for (const n of numbers) expect(data.maps[data.ids[n]], String(n)).toBeDefined();
  });
});

describe('runMapsBuild', () => {
  function fakeDownload(calls: Array<[string, string]>) {
    return async (url: string, dest: string): Promise<void> => {
      calls.push([url, dest]);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, url === MAP_LIST_URL ? list : refs);
    };
  }

  it('downloads the two files when absent, writes the JSON, and a second run on the same download changes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'maps-build-'));
    try {
      const out = join(dir, 'out', 'biblemapper.json');
      const calls: Array<[string, string]> = [];
      const lines: string[] = [];
      const first = await runMapsBuild({ rawDir: join(dir, 'raw'), outFile: out, download: fakeDownload(calls), log: (l) => lines.push(l) });
      expect(calls.map(([url]) => url)).toEqual([MAP_LIST_URL, MAP_REF_LIST_URL]);
      expect(MAP_LIST_URL).toBe('https://biblemapper.com/blog/mapfinder/MapList.json');
      expect(MAP_REF_LIST_URL).toBe('https://biblemapper.com/blog/mapfinder/MapRefList.json');
      expect(first.written).toBe(true);
      expect(existsSync(out)).toBe(true);
      expect(first.dropped).toEqual(['JudahAlone', 'Mesoptamia']);
      expect(lines.filter((l) => l.startsWith('warning')).length).toBe(2);
      const bytes = readFileSync(out, 'utf8');

      const second = await runMapsBuild({ rawDir: join(dir, 'raw'), outFile: out, download: fakeDownload(calls) });
      expect(calls.length).toBe(2); // nothing downloaded again
      expect(second.written).toBe(false);
      expect(readFileSync(out, 'utf8')).toBe(bytes);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
