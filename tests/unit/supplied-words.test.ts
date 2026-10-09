// The words the translators supplied (mw-5r3p30.102): the data keeps WHICH words of a chunk are in the MSB's [brackets] (`s`, positions among the
// chunk's white-space separated words), the reader italicises only those, and the tutor is sent them between asterisks.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { type BookIndex, type Chapter, type EnglishChunk, englishRuns, markSupplied } from '../../src/data/chapter';
import { buildRequest } from '../../src/services/tutor';
import { buildTalkRequest } from '../../src/services/talk';

const load = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const hebrews7 = load('heb/7');
const verse1 = hebrews7.verses[0];
const chunkOf = (text: string): EnglishChunk => {
  const c = verse1.e.find((x) => x.t === text);
  if (!c) throw new Error(`no chunk "${text}"`);
  return c;
};
const allChunks = (): EnglishChunk[] => {
  const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
  const files = readdirSync('public/data', { recursive: true }).map(String).filter((p) => /^[0-9a-z]+[\\/]\d+\.json$/.test(p));
  expect(files.length).toBe(Object.values(index.books).reduce((n, b) => n + b.chapters, 0));
  return files.flatMap((f) => load(f.replace(/\.json$/, '')).verses.flatMap((v) => v.e));
};
const alnum = (s: string): string => s.replace(/[^\p{L}\p{N}]/gu, '');
const wordsOf = (c: EnglishChunk): string[] => c.t.split(/\s+/).filter(Boolean);

describe('Hebrews 7:1 in the data', () => {
  it('has "was" and "and" supplied and "king" and "priest" not', () => {
    expect(chunkOf('was king').s).toEqual([0]);
    expect(chunkOf('and priest').s).toEqual([0]);
    expect(englishRuns(chunkOf('was king'))).toEqual([{ text: 'was', supplied: true }, { text: 'king', supplied: false }]);
    expect(englishRuns(chunkOf('and priest'))).toEqual([{ text: 'and', supplied: true }, { text: 'priest', supplied: false }]);
    expect(chunkOf('of Salem').s).toBeUndefined();
  });
});

describe('every chapter', () => {
  it('lists supplied words as sorted, unique positions inside the chunk, and never an empty list', () => {
    for (const c of allChunks()) {
      if (c.s === undefined) continue;
      expect(c.s.length).toBeGreaterThan(0);
      expect([...new Set(c.s)].sort((a, b) => a - b)).toEqual(c.s);
      expect(c.s.every((i) => Number.isInteger(i) && i >= 0 && i < wordsOf(c).length)).toBe(true);
    }
  });

  it('italicises the whole chunk only when every word of it with a letter is supplied', () => {
    const whole = allChunks().filter((c) => c.s && wordsOf(c).every((w, i) => !/[\p{L}\p{N}]/u.test(w) || c.s?.includes(i)));
    const partial = allChunks().filter((c) => c.s && !whole.includes(c));
    expect(whole.length).toBeGreaterThan(2000);
    expect(partial.length).toBeGreaterThan(5000);
  });

  // Needs the MSB download the data build keeps in data/raw (git-ignored): `npm run data:build` fetches it. Skipped without it.
  it.skipIf(!existsSync('data/raw/msb_nt_tables.tsv'))('has a wholly supplied chunk exactly where the MSB brackets every letter of a word\'s English', () => {
    const rows = readFileSync('data/raw/msb_nt_tables.tsv', 'utf8').split(/\r?\n/).slice(1).map((l) => l.split('\t')[18] ?? '');
    const bracketed = rows
      .filter((e) => e.includes('[') && !/[\p{L}\p{N}]/u.test(e.replace(/\[[^\]]*\]/g, '')))
      .map(alnum)
      .sort();
    const chunks = allChunks()
      .filter((c) => c.s && wordsOf(c).every((w, i) => !/[\p{L}\p{N}]/u.test(w) || c.s?.includes(i)))
      .map((c) => alnum(c.t))
      .sort();
    expect(chunks).toEqual(bracketed);
  });
});

describe('what the tutor is sent', () => {
  it('marks each supplied run of a chunk between asterisks', () => {
    expect(markSupplied(chunkOf('was king'))).toBe('*was* king');
    expect(markSupplied(chunkOf('and priest'))).toBe('*and* priest');
    expect(markSupplied(chunkOf('of Salem'))).toBe('of Salem');
    expect(markSupplied({ t: 'there is now', g: [0], s: [0, 1] })).toBe('*there is* now');
  });

  it("puts the marks in the verse-ask request's English", () => {
    const r = buildRequest('Hebrews 7:1', verse1, 'why are there italic words', []);
    expect(r.english).toContain('Melchizedek *was* king of Salem *and* priest of God Most High.');
    expect(r.english).not.toMatch(/\bwas king\b(?<!\*was\* king)/);
  });

  it("puts the marks in the Bible talk's English, for a verse, a passage and a chapter", () => {
    for (const verse of [verse1, null]) {
      const r = buildTalkRequest({ title: 'Hebrews 7', chapter: hebrews7, verse }, 'why are there italic words', [], []);
      expect(r.english).toContain('*was* king of Salem *and* priest');
    }
  });
});

describe('what the grinds are told', () => {
  for (const grind of ['verse-ask', 'bible-talk']) {
    it(`${grind}: marked words are italic in his reader, supplied by the translators, and the text always shows them`, () => {
      const text = readFileSync(`grinds/${grind}.instructions.md`, 'utf8').replace(/\s+/g, ' ');
      expect(text).toContain('## Italic words');
      const section = text.slice(text.indexOf('## Italic words'), text.indexOf(' ## ', text.indexOf('## Italic words') + 5));
      expect(section).toContain('between asterisks');
      expect(section).toContain('italics in his reader');
      expect(section).toContain('the translators supplied those words');
      expect(section).toMatch(/Never say the text shows no italics/);
      expect(section).toContain('why some words are italic');
    });
  }

  it("describes the marks in the bible-talk input schema's english field", () => {
    const schema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as { properties: { english: { description: string } } };
    expect(schema.properties.english.description).toContain('between asterisks');
  });
});
