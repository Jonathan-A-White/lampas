// tests/unit/lxx-chapter-load.test.ts — Lampas Septuagint R3 (mw-u2w5klk.11): loadChapter of an Old Testament book follows Settings > Old Testament in Greek (Septuagint). On, a book shipped in
// public/data-lxx is the Greek chapter its index names for the Lampas chapter (Psalm 23 is Greek 22.json, Psalm 10 the Greek chapter that holds it); Off, or a book the index lacks, is the Hebrew.
// The files are the fixtures in tests/fixtures/data-lxx (Genesis 1 and Greek Psalms 9, 22, 114 and 115, built by scripts/data-build-lxx.ts from tests/fixtures/lxx; its index maps Psalms 9 and 10 to Greek 9 and Psalm 116 to Greek 114 and 115).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { loadChapter } from '../../src/data/chapter';
import { greekChapterOf, notReadyName, type LxxIndex } from '../../src/data/lxxChapter';
import { septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch, type ChapterFetch } from '../support/chapter-fetch';
import index from '../fixtures/data-lxx/index.json' with { type: 'json' };

let fetched: ChapterFetch;
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  fetched = stubChapterFetch();
});
afterEach(() => vi.unstubAllGlobals());

const lxxRequests = (): string[] => fetched.requests.filter((url) => url.startsWith('/data-lxx/'));
const hebrewRequests = (): string[] => fetched.requests.filter((url) => url.startsWith('/data/') && !url.includes('index') && !url.includes('lexicon'));

describe('the Greek chapter of a Lampas chapter', () => {
  const from = index as unknown as LxxIndex;
  it('maps Psalm 23 to Greek 22 and Psalm 10 to the Greek chapter the index names for it', () => {
    expect(greekChapterOf(from, 'psa', 23)).toMatchObject({ code: 'psa', chapter: 22 });
    expect(greekChapterOf(from, 'psa', 10)).toMatchObject({ code: 'psa', chapter: 9 });
    expect(greekChapterOf(from, 'gen', 1)).toMatchObject({ code: 'gen', chapter: 1 });
  });
  it('is null for a book or a chapter the index does not ship', () => {
    expect(greekChapterOf(from, 'isa', 1)).toBeNull();
    expect(greekChapterOf(from, 'gen', 2)).toBeNull();
  });
});

describe('loadChapter with the Septuagint On', () => {
  beforeEach(() => setSetting(septuagintSetting, 'on'));

  it('with Genesis shipped for chapters 1 to 6 only (mw-u2w5klk.265, scripts/lxx/ship.ts) opens Genesis 3 from the Septuagint and Genesis 7 as the Hebrew', async () => {
    const fill = <T,>(n: number, v: T): T[] => Array.from({ length: n }, () => v);
    const six = {
      sources: {},
      books: [{ code: 'gen', name: 'Genesis', lampas: 'gen', lang: 'grc', chapters: 50, shipped: [1, 2, 3, 4, 5, 6], verses: [31, 25, 24, 26, 32, 22, ...fill(44, 0)], fingerprints: fill(50, ''), lampasChapters: [[1], [2], [3], [4], [5], [6], ...fill<number[]>(44, [])] }],
    };
    const three = { book: 'Genesis', code: 'gen', chapter: 3, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {}, parse: {}, verses: [] };
    const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const base = globalThis.fetch;
    const asked: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      asked.push(url);
      if (url === '/data-lxx/index.json') return json(six);
      if (url === '/data-lxx/gen/3.json') return json(three);
      return base(input);
    }));
    expect(await loadChapter('gen', 3)).toMatchObject({ code: 'gen', chapter: 3, lang: 'grc' });
    expect(asked).toContain('/data-lxx/gen/3.json');
    const hebrew = await loadChapter('gen', 7);
    expect(hebrew).toMatchObject({ code: 'gen', chapter: 7, lang: 'hbo' });
    expect(asked.filter((u) => u.startsWith('/data/gen/7.json'))).toHaveLength(1);
    expect(asked.some((u) => u.startsWith('/data-lxx/gen/7'))).toBe(false);
  });

  it('loads Psalm 23 from public/data-lxx/psa/22.json: Greek, Brenton, Greek chapter 22, the book under Lampas\'s code', async () => {
    const chapter = await loadChapter('psa', 23);
    expect(lxxRequests()).toEqual(['/data-lxx/index.json', '/data-lxx/psa/22.json?v=7098b55d4464', '/data-lxx/lexicon-grc-lxx.json']);
    expect(chapter).toMatchObject({ code: 'psa', chapter: 22, lang: 'grc', translation: 'lxx2012', edition: 'swete' });
    expect(chapter.verses[0].ref).toEqual({ book: 'psa', chapter: 23, verse: 1 });
    // the Lampas chapter's own file is read for its section headings and for nothing else (mw-u2w5klk.302)
    expect(hebrewRequests().map((url) => url.replace(/\?v=.*/, ''))).toEqual(['/data/psa/23.json']);
  });

  it('asks for the Greek chapter the index names for Psalm 10, and keeps only the verses that are Psalm 10\'s', async () => {
    // Psalms 9 and 10 are one Greek chapter, 9 (mw-u2w5klk.18: the fixture's file holds verses of both)
    const chapter = await loadChapter('psa', 10);
    expect(lxxRequests()).toEqual(['/data-lxx/index.json', '/data-lxx/psa/9.json', '/data-lxx/lexicon-grc-lxx.json']);
    expect(chapter).toMatchObject({ code: 'psa', chapter: 9 });
    expect(chapter.verses.map((v) => v.n)).toEqual([22, 23]);
  });

  it('loads Genesis 1 in the Greek with the English of Brenton under it', async () => {
    const chapter = await loadChapter('gen', 1);
    expect(chapter.lang).toBe('grc');
    expect(chapter.verses[0].e[0].t).toBe('In the beginning God made the heaven and the earth.');
  });

  it('reads the Hebrew of a book the index does not ship', async () => {
    const chapter = await loadChapter('isa', 1);
    expect(chapter.lang).toBe('hbo');
    expect(lxxRequests()).toEqual(['/data-lxx/index.json']);
    expect(hebrewRequests()).toHaveLength(1);
    expect(hebrewRequests()[0]).toMatch(/^\/data\/isa\/1\.json/);
  });

  it('keeps today\'s behaviour for a chapter whose Greek file fails to fetch: the load fails, it is not read as the Hebrew', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/data-lxx/index.json') return new Response(JSON.stringify(index), { status: 200 });
      return new Response('', { status: 500 });
    }));
    await expect(loadChapter('gen', 1)).rejects.toThrow();
  });

  it('reads the Hebrew when the Septuagint index cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('/data-lxx/') ? new Response('', { status: 404 }) : new Response(JSON.stringify({ book: 'Isaiah', code: 'isa', chapter: 1, lang: 'hbo', lex: {}, parse: {}, verses: [] })))));
    expect((await loadChapter('isa', 1)).lang).toBe('hbo');
  });

  it('never asks for the Septuagint for a book of the New Testament', async () => {
    await loadChapter('jhn', 1);
    expect(lxxRequests()).toEqual([]);
  });
});

describe('loadChapter with the Septuagint Off', () => {
  it('loads public/data/psa/23.json, the Hebrew, and never asks for the Septuagint', async () => {
    const chapter = await loadChapter('psa', 23);
    expect(chapter).toMatchObject({ code: 'psa', chapter: 23, lang: 'hbo' });
    expect(hebrewRequests()[0]).toMatch(/^\/data\/psa\/23\.json/);
    expect(lxxRequests()).toEqual([]);
  });

  it('keeps the Hebrew and the Greek of one chapter apart when the setting changes', async () => {
    expect((await loadChapter('gen', 1)).lang).toBe('hbo');
    await setSetting(septuagintSetting, 'on');
    expect((await loadChapter('gen', 1)).lang).toBe('grc');
    await setSetting(septuagintSetting, 'off');
    expect((await loadChapter('gen', 1)).lang).toBe('hbo');
  });
});

// mw-u2w5klk.298: the notice named the whole book for Genesis 14 alone, which was held back when every other Genesis chapter shipped.
describe('what the "not ready" notice names', () => {
  const from = index as unknown as LxxIndex;
  it('names the chapter when the book ships but this chapter does not: "Genesis 2"', () => {
    expect(notReadyName(from, 'gen', 2, 'Genesis')).toBe('Genesis 2');
  });
  it('names the book when the book is not shipped at all, or the index could not be read', () => {
    expect(notReadyName(from, 'isa', 1, 'Isaiah')).toBe('Isaiah');
    expect(notReadyName(null, 'gen', 2, 'Genesis')).toBe('Genesis');
  });
});
