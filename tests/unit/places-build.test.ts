// scripts/places/tipnr.ts and scripts/places-build.ts: STEPBible's TIPNR cut into the places of each book (docs/maps.md). The parse runs on a real cut of the file
// (tests/fixtures/places/tipnr-slice.txt); the network is never used.
import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CANON } from '../../src/data/canon';
import { runPlacesBuild, withPositions } from '../../scripts/places-build';
import { coordinatesOf, expandRefs, parseTipnr, placesOfBook, stripMarks } from '../../scripts/places/tipnr';
import type { Place } from '../../src/maps/types';

const SLICE = 'tests/fixtures/places/tipnr-slice.txt';
const slice = readFileSync(SLICE, 'utf8');
const places = parseTipnr(slice);
const byId = (id: string) => places.find((p) => p.id === id);

describe('the parse of TIPNR', () => {
  it('keeps the fixture a real cut under 30 KB', () => {
    expect(statSync(SLICE).size).toBeLessThan(30_000);
  });

  it('reads the places of the cut and not the person Sidon', () => {
    expect(places.map((p) => p.id).sort()).toEqual([
      'Abel@1Sa.6.18',
      'Admah@Gen.10.19-Hos',
      'Eden@Gen.2.8-Jol',
      'Gaza@Gen.10.19-Act',
      'Gerar@Gen.10.19-2Ch',
      'Lasha@Gen.10.19-Num',
      'Sidon@Gen.10.19-Act',
    ]);
    expect(places.some((p) => p.id.startsWith('Sidon@Gen.10.15'))).toBe(false); // the PERSON record
    expect(slice).toContain('Sidon@Gen.10.15-1Ch=H6721G'); // it is in the cut, and is not a place
  });

  it('reads Gerar whole: its name, Strong\'s number, position, region and every verse', () => {
    const gerar = byId('Gerar@Gen.10.19-2Ch');
    expect(gerar).toMatchObject({ name: 'Gerar', names: ['Gerar'], strongs: ['H1642'], lat: 31.39129, lng: 34.56057, region: 'Philistia' });
    expect(gerar?.refs.map((r) => `${r.book} ${r.chapter}:${r.verse}`)).toEqual([
      'gen 10:19', 'gen 20:1', 'gen 20:2', 'gen 26:1', 'gen 26:6', 'gen 26:17', 'gen 26:20', 'gen 26:26', '2ch 14:13', '2ch 14:14',
    ]);
  });

  it('keeps both names of Lasha, and a place\'s other forms once each', () => {
    expect(byId('Lasha@Gen.10.19-Num')).toMatchObject({ name: 'Lasha', names: ['Lasha', 'Nahaliel'], strongs: ['H3962', 'H5160'] });
    expect(byId('Sidon@Gen.10.19-Act')?.names).toEqual(['Sidon', 'Great Sidon', 'Zidon', 'Sidonian', 'Zidonian']);
  });

  it('takes the place Sidon\'s verses of every book, even where the list says "ff"', () => {
    const sidon = placesOfBook(places, 'isa').find((p) => p.name === 'Sidon');
    expect(sidon?.verses).toEqual([[23, 2], [23, 4], [23, 12]]);
    expect(placesOfBook(places, 'act').find((p) => p.name === 'Sidon')?.verses).toEqual([[12, 20], [27, 3]]);
  });

  it('leaves out the position of a record with none, and the placeholders for none', () => {
    const abel = byId('Abel@1Sa.6.18')!;
    expect(abel.lat).toBeUndefined();
    expect(abel.lng).toBeUndefined();
    expect(abel.region).toBeUndefined(); // '>'
    expect(Object.keys(abel)).not.toContain('lat');
    expect(byId('Eden@Gen.2.8-Jol')?.lat).toBeUndefined(); // '@0,14z'
    expect(coordinatesOf('https://www.google.com/maps/@,14z')).toBeUndefined();
    expect(coordinatesOf('https://www.google.com/maps/@0,14z')).toBeUndefined();
    expect(coordinatesOf('https://www.google.com/maps/@31.5,34.25,14z')).toEqual({ lat: 31.5, lng: 34.25 });
  });

  it('strips the (?) and (d) marks', () => {
    expect(byId('Eden@Gen.2.8-Jol')?.region).toBe('Mesopotamia'); // 'Mesopotamia(?)' in the file
    expect(stripMarks('Canaan@Gen.9.18-1Ch(d)')).toBe('Canaan@Gen.9.18-1Ch');
    expect(stripMarks('Jahdai@1Ch.2.47(?)')).toBe('Jahdai@1Ch.2.47');
    expect(places.every((p) => !/\((\?|[adf])\)/.test(JSON.stringify(p)))).toBe(true);
  });
});

describe('expandRefs', () => {
  const show = (field: string) => expandRefs(field).map((r) => `${r.book} ${r.chapter}:${r.verse}`);

  it('expands the abbreviated list: a chapter\'s verses after a comma, a new book after "; "', () => {
    expect(show('Gen.10.19; 20.1,2; 26.1,6,17,20,26; 2Ch.14.13,14')).toEqual([
      'gen 10:19', 'gen 20:1', 'gen 20:2', 'gen 26:1', 'gen 26:6', 'gen 26:17', 'gen 26:20', 'gen 26:26', '2ch 14:13', '2ch 14:14',
    ]);
  });

  it('expands a range, and names the two ends of a range across chapters', () => {
    expect(show('Gen.1.10-12')).toEqual(['gen 1:10', 'gen 1:11', 'gen 1:12']);
    expect(show('Gen.1.30-2.3')).toEqual(['gen 1:30', 'gen 2:3']);
  });

  it('drops the letters after a verse and the "ff", and a trailing semicolon', () => {
    expect(show('Num.21.19a; Num.21.19b; Isa.23.2ff; Jos.19.28; 11.8;')).toEqual(['num 21:19', 'num 21:19', 'isa 23:2', 'jos 19:28', 'jos 11:8']);
  });

  it('reads a book named after a comma, and passes over the Greek Old Testament\'s numbering', () => {
    expect(show('Gen.12.10,Exo.1.19; LXX.Num.21.19')).toEqual(['gen 12:10', 'exo 1:19']);
  });

  it('warns of what it cannot read', () => {
    const warned: string[] = [];
    expect(expandRefs('Xyz.1.1; Gen.1.x', (t) => warned.push(t))).toEqual([]);
    expect(warned).toEqual(['Xyz.1.1', '1.x']);
  });
});

describe('npm run places:build', () => {

  it('downloads TIPNR when absent, writes one file per book with places, and a second run changes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'places-'));
    const downloads: string[] = [];
    const options = { rawDir: join(dir, 'raw'), outDir: join(dir, 'out'), download: async (url: string, dest: string) => void (downloads.push(url), mkdirSync(dirname(dest), { recursive: true }), copyFileSync(SLICE, dest)) };
    const first = await runPlacesBuild(options);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toContain('STEPBible/STEPBible-Data/master/Proper%20Nouns/TIPNR');
    const named = new Set(places.flatMap((p) => p.refs.map((r) => r.book)));
    expect(first.books).toEqual(CANON.map((b) => b.code).filter((code) => named.has(code))); // canon order, only books with places
    expect(first.books).toEqual(expect.arrayContaining(['gen', '1sa', '2ch', 'isa', 'act']));
    expect(readdirSync(join(dir, 'out')).sort()).toEqual(first.books.map((b) => `${b}.json`).sort());
    expect(first.written).toEqual(first.books);
    expect(first.withCoordinates).toBe(5);
    const second = await runPlacesBuild(options);
    expect(downloads).toHaveLength(1); // the raw file is there
    expect(second.written).toEqual([]);
    const gen = JSON.parse(readFileSync(join(dir, 'out', 'gen.json'), 'utf8')) as Place[];
    expect(gen.find((p) => p.name === 'Gerar')).toMatchObject({ id: 'Gerar@Gen.10.19-2Ch', verses: [[10, 19], [20, 1], [20, 2], [26, 1], [26, 6], [26, 17], [26, 20], [26, 26]] });
  });

  it('keeps the word a place stands at in a verse (pos) where a chapter has a word with its Strong\'s number', () => {
    const gerar: Place = { id: 'Gerar@Gen.10.19-2Ch', name: 'Gerar', names: ['Gerar'], strongs: ['H1642'], verses: [[10, 19], [20, 1]] };
    const sidon: Place = { id: 'Sidon@Gen.10.19-Act', name: 'Sidon', names: ['Sidon'], strongs: ['H6721H', 'G4605'], verses: [[10, 19]] };
    const none: Place = { id: 'Abel@1Sa.6.18', name: 'Abel', names: ['Abel'], strongs: ['H0059G'], verses: [[6, 18]] };
    const words = (_book: string, chapter: number, verse: number) => (chapter === 10 && verse === 19 ? ['H1961', 'H6721', 'H935', 'H1642'] : undefined);
    const out = withPositions([gerar, sidon, none], 'gen', words);
    expect(out[0].pos).toEqual([3, -1]);
    expect(out[1].pos).toEqual([1]);
    expect(out[2].pos).toBeUndefined();
  });
});

describe('the committed files', () => {
  const dir = 'src/maps/data/places';
  const codes = new Set(CANON.map((b) => b.code));

  it('are named for the app\'s book codes, and the biggest is under 120 KB', () => {
    const files = readdirSync(dir);
    expect(files.length).toBeGreaterThan(50);
    for (const f of files) expect(codes.has(f.replace(/\.json$/, ''))).toBe(true);
    expect(Math.max(...files.map((f) => statSync(join(dir, f)).size))).toBeLessThan(120_000);
  });

  it('hold only places with a verse in their book, each with its id once', () => {
    for (const f of readdirSync(dir)) {
      const list = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Place[];
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
      for (const p of list) {
        expect(p.verses.length).toBeGreaterThan(0);
        expect(p.names).toContain(p.name);
        if (p.pos) expect(p.pos).toHaveLength(p.verses.length);
        expect(p.lat === undefined).toBe(p.lng === undefined);
        expect(p.region).not.toBe('>');
      }
    }
  });
});
