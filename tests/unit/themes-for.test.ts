// src/themes/ (mw-qtu3zvz.4, docs/sermons.md 'The themes'): the topics of a verse or passage from a list of sources, the part label each carries, the switches, and the bundled sources reading the committed
// public/themes files. The tests' own sources are tests/support/test-themes.ts; the bundled ones are tried with a fetch that answers from the files on disk.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLinkRef, THEME_INDEX, themeBookUrl } from '../../src/data/themeIndex';
import { enabledSources, sourceKey } from '../../src/themes/enabled';
import { bookOf, bundledSources, forgetThemeFiles } from '../../src/themes/sources/bundled';
import { themesForSources, themeText } from '../../src/themes/themesFor';
import { secondThemes, testThemes } from '../support/test-themes';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  forgetThemeFiles();
});

const texts = async (...args: Parameters<typeof themesForSources>) => (await themesForSources(...args)).map((t) => t.text);

describe('themesForSources: the topics of a verse', () => {
  it('names the topics whose links overlap the verse, the narrower link first, with the part label the module gives', async () => {
    expect(await texts([testThemes], { book: 'rom', chapter: 5, from: 8 })).toEqual(['Atonement: Doctrine of', 'Love-Hatred: Of God', 'God']);
  });

  it('says Love-Hatred: Of God as the module names it, never "Love of God (Of God)"', () => {
    expect(themeText('Love-Hatred', 'Of God')).toBe('Love-Hatred: Of God');
    expect(themeText('Aaron', undefined)).toBe('Aaron');
  });

  it('carries the source, its name, the topic, the part and the topic\'s verses and books', async () => {
    const [first] = await themesForSources([testThemes], { book: 'rom', chapter: 5, from: 8 });
    expect(first).toEqual({ source: 'testthemes', sourceName: 'Test Themes', topic: 'atonement', label: 'Atonement', part: 1, partLabel: 'Doctrine of', verses: 20, books: ['rom', 'jon'], text: 'Atonement: Doctrine of' });
    const god = (await themesForSources([testThemes], { book: 'rom', chapter: 5, from: 8 })).find((t) => t.topic === 'god')!;
    expect('books' in god).toBe(false);
    expect('part' in god).toBe(false);
  });

  it('takes a passage: the topics of any verse of it', async () => {
    expect(await texts([testThemes], { book: 'rom', chapter: 5, from: 12, to: 21 })).toEqual(['Atonement: Doctrine of', 'God']);
    expect(await texts([testThemes], { book: 'rom', chapter: 5, from: 1, to: 11 })).toEqual(['Atonement: Doctrine of', 'Love-Hatred: Of God', 'God']);
  });

  it('has none for a whole chapter, a verse no link touches and a book the source has no file for', async () => {
    expect(await texts([testThemes], { book: 'rom', chapter: 5 })).toEqual([]);
    expect(await texts([testThemes], { book: 'rom', chapter: 5, from: 22 })).toEqual([]);
    expect(await texts([testThemes], { book: 'mat', chapter: 5, from: 1 })).toEqual([]);
  });

  it('lists a topic once, with its narrowest link, and the lowest part where two are as narrow', async () => {
    const twice = {
      ...testThemes,
      book: async () => ({
        topics: [{ id: 't', label: 'T', parts: [{ n: 2, label: 'Two' }, { n: 3, label: 'Three' }], verses: 4 }],
        links: [
          { topic: 't', part: 3, ref: { book: 'rom', chapter: 5, from: 8, to: 8 } },
          { topic: 't', part: 2, ref: { book: 'rom', chapter: 5, from: 8, to: 8 } },
          { topic: 't', part: 1, ref: { book: 'rom', chapter: 5, from: 1, to: 21 } },
        ],
      }),
    };
    expect(await texts([twice], { book: 'rom', chapter: 5, from: 8 })).toEqual(['T: Two']);
  });

  it('keeps each source\'s topics together, the sources in the list\'s order', async () => {
    expect(await texts([testThemes, secondThemes], { book: 'rom', chapter: 5, from: 8 })).toEqual(['Atonement: Doctrine of', 'Love-Hatred: Of God', 'God', 'Commendation']);
    expect(await texts([secondThemes, testThemes], { book: 'rom', chapter: 5, from: 8 })).toEqual(['Commendation', 'Atonement: Doctrine of', 'Love-Hatred: Of God', 'God']);
  });

  it('logs a source that fails and lets the others answer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = { ...secondThemes, id: 'broken', book: async () => Promise.reject(new Error('404')) };
    expect(await texts([broken, testThemes], { book: 'rom', chapter: 5, from: 8 })).toEqual(['Atonement: Doctrine of', 'Love-Hatred: Of God', 'God']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('broken'));
  });
});

describe('enabledSources: one switch for each theme source', () => {
  it('keeps a source by its own switch, themes.<id>, and its default where nothing is saved', () => {
    expect(sourceKey(testThemes)).toBe('themes.testthemes');
    expect(enabledSources([testThemes, secondThemes], () => undefined).map((s) => s.id)).toEqual(['testthemes', 'testthemes2']);
    expect(enabledSources([testThemes, secondThemes], (key) => (key === 'themes.testthemes' ? 'off' : undefined)).map((s) => s.id)).toEqual(['testthemes2']);
    expect(enabledSources([{ ...testThemes, default: 'off' }], () => undefined)).toEqual([]);
    expect(enabledSources([{ ...testThemes, default: 'off' }], () => 'on')).toHaveLength(1);
  });
});

describe('parseLinkRef: a link as the book file writes it', () => {
  it('reads a verse, a range in a chapter and a range over chapters; refuses what is not one', () => {
    expect(parseLinkRef('5.8')).toEqual({ chapter: 5, from: 8, to: 8 });
    expect(parseLinkRef('23.1-6')).toEqual({ chapter: 23, from: 1, to: 6 });
    expect(parseLinkRef('5.12-6.4')).toEqual({ chapter: 5, from: 12, to: 4, toChapter: 6 });
    expect(parseLinkRef('5')).toBeUndefined();
    expect(parseLinkRef('5.8-')).toBeUndefined();
    expect(parseLinkRef('x')).toBeUndefined();
  });
});

describe('the bundled sources: one for each source of public/themes/index.json', () => {
  const read = (path: string): string => readFileSync(`public${path.split('?')[0]}`, 'utf8');
  const stubFetch = () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(url);
      return new Response(read(url), { status: 200 });
    });
    return asked;
  };

  it('are Thompson\'s 1934 subject index and Torrey\'s, both On to start', () => {
    const sources = bundledSources();
    expect(sources.map((s) => s.id)).toEqual(['themes-tcr1934', 'themes-torrey']);
    expect(sources.every((s) => s.default === 'on')).toBe(true);
    expect(sources[0].name).toBe('Thompson Chain Topics (1934 subject index)');
    for (const source of sources) expect(source.describe.length).toBeLessThanOrEqual(90);
  });

  it('ask for a book once, by the fingerprinted address, and for no book the source lacks', async () => {
    const asked = stubFetch();
    const [thompson] = bundledSources();
    await thompson.book('rom');
    await thompson.book('rom');
    expect(asked).toEqual([themeBookUrl('themes-tcr1934', 'rom')]);
    expect(asked[0]).toMatch(/^\/themes\/themes-tcr1934\/rom\.json\?v=[0-9a-f]{12}$/);
    expect(await thompson.book('tob')).toEqual({ topics: [], links: [] });
    expect(asked).toHaveLength(1);
  });

  it('name Romans 5:8 as the module does: Love-Hatred: Of God (Thompson) and Torrey\'s Love of God', async () => {
    stubFetch();
    const names = await texts(bundledSources(), { book: 'rom', chapter: 5, from: 8 });
    expect(names).toContain('Love-Hatred: Of God');
    expect(names.length).toBeGreaterThan(5);
    expect(names.every((n) => !/Chain.Reference/i.test(n))).toBe(true);
  });

  it('make every link of a book file a passage of that book, in Lampas\'s chapters', () => {
    const file = JSON.parse(read(themeBookUrl('themes-torrey', 'rom'))) as Parameters<typeof bookOf>[1];
    const book = bookOf('rom', file);
    expect(book.links).toHaveLength(file.links.length);
    expect(book.links.every((l) => l.ref.book === 'rom' && l.ref.chapter >= 1 && l.ref.chapter <= 16)).toBe(true);
    const ids = new Set(book.topics.map((t) => t.id));
    expect(book.links.every((l) => ids.has(l.topic))).toBe(true);
  });

  it('are listed by the index with a fingerprint, licence and credit each', () => {
    expect(THEME_INDEX.sources.map((s) => s.id)).toEqual(['themes-tcr1934', 'themes-torrey']);
    for (const s of THEME_INDEX.sources) {
      expect(s.fingerprint).toMatch(/^[0-9a-f]{12}$/);
      expect(s.licence).toMatch(/^DistributionLicense=Public Domain$/);
      expect(s.credit.length).toBeGreaterThan(20);
      expect(s.books).toHaveLength(66);
    }
  });
});
