// The recorded voice's timings (mw-82lb97i.1): the shape of public/data/audio/msb-david/, the guard that holds a file to it, the loader that never throws,
// the lookup from a second of the recording to a verse, and the worker's rule for /data/audio/ (network first, never the cache-first rule for the rest of /data/).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chapterTimingsNow,
  forgetTimings,
  isBookTimings,
  isTimingsIndex,
  loadBookTimings,
  loadTimingsIndex,
  spanOf,
  verseAt,
  type BookTimings,
  type ChapterTimings,
} from '../../src/data/audioTimings';

/** The epic's example: John 3 with its first two verses. */
const example = (): BookTimings => ({
  v: 1,
  edition: 'msb-david',
  book: 'jhn',
  chapters: { '3': { audio: 'https://openbible.com/audio/msb/MSB_43_Jhn_003_D.mp3', duration: 312.45, verses: [[1, 4.2, 12.86], [2, 12.86, 27.31]] } },
});

const withVerses = (verses: unknown, patch: Record<string, unknown> = {}): unknown => {
  const book = example();
  return { ...book, chapters: { '3': { ...book.chapters['3'], verses, ...patch } } };
};

describe('isBookTimings', () => {
  it('accepts the contract\'s example', () => {
    expect(isBookTimings(example())).toBe(true);
  });

  it('refuses a verse whose start is not before its end', () => {
    expect(isBookTimings(withVerses([[1, 12.86, 12.86]]))).toBe(false);
    expect(isBookTimings(withVerses([[1, 14, 12.86]]))).toBe(false);
  });

  it('refuses two verses that overlap', () => {
    expect(isBookTimings(withVerses([[1, 4.2, 13], [2, 12.86, 27.31]]))).toBe(false);
  });

  it('refuses verse numbers out of order, or repeated', () => {
    expect(isBookTimings(withVerses([[2, 4.2, 12.86], [1, 12.86, 27.31]]))).toBe(false);
    expect(isBookTimings(withVerses([[1, 4.2, 12.86], [1, 12.86, 27.31]]))).toBe(false);
  });

  it('refuses a last end past the duration', () => {
    expect(isBookTimings(withVerses([[1, 4.2, 12.86], [2, 12.86, 400]]))).toBe(false);
  });

  it('refuses an audio address that is not https', () => {
    expect(isBookTimings(withVerses(example().chapters['3'].verses, { audio: 'http://openbible.com/audio/msb/MSB_43_Jhn_003_D.mp3' }))).toBe(false);
    expect(isBookTimings(withVerses(example().chapters['3'].verses, { audio: '/audio/x.mp3' }))).toBe(false);
    expect(isBookTimings(withVerses(example().chapters['3'].verses, { audio: 42 }))).toBe(false);
  });

  it('refuses a file with no chapters key', () => {
    const { chapters: _chapters, ...rest } = example();
    void _chapters;
    expect(isBookTimings(rest)).toBe(false);
    expect(isBookTimings({ ...example(), chapters: null })).toBe(false);
  });

  it('refuses a wrong version, a wrong edition, no book, a non-number triple and anything that is not an object', () => {
    expect(isBookTimings({ ...example(), v: 2 })).toBe(false);
    expect(isBookTimings({ ...example(), edition: 'other' })).toBe(false);
    expect(isBookTimings({ ...example(), book: 3 })).toBe(false);
    expect(isBookTimings(withVerses([[1, '4.2', 12.86]]))).toBe(false);
    expect(isBookTimings(withVerses([[1, 4.2, Infinity]]))).toBe(false);
    expect(isBookTimings(withVerses([[1, 4.2]]))).toBe(false);
    expect(isBookTimings(withVerses([[1, 4.2, 12.86, 9]]))).toBe(false);
    expect(isBookTimings(withVerses([[1.5, 4.2, 12.86]]))).toBe(false);
    expect(isBookTimings(withVerses([]))).toBe(false);
    expect(isBookTimings(withVerses([[1, 4.2, 12.86]], { duration: 0 }))).toBe(false);
    expect(isBookTimings(null)).toBe(false);
    expect(isBookTimings('<html>')).toBe(false);
    expect(isBookTimings([])).toBe(false);
  });

  it('refuses a chapter key that is not a chapter number', () => {
    const book = example();
    expect(isBookTimings({ ...book, chapters: { three: book.chapters['3'] } })).toBe(false);
  });

  it('lets a verse start where the one before it ended, a gap between verses, and a last end at the duration', () => {
    expect(isBookTimings(withVerses([[1, 0.5, 5], [2, 5, 6], [4, 8, 312.45]]))).toBe(true);
  });
});

// mw-82lb97i.27 moved each verse's end by the recording's energy and changed nothing of the file's shape. The worker asks the network first for a timing file (below), so a
// phone gets today's file with no change of the data cache's name; one that is answered by the copy it kept yesterday (a slow network) must still read it.
describe('yesterday\'s timing file (2026-11-11, before the gap pass) is still read', () => {
  /** John 1's last three verses as the file had them on 2026-11-11: verse 50 ended at 371.25, a quarter second after the aligner's last letter. */
  const yesterday = (): unknown => ({
    v: 1,
    edition: 'msb-david',
    book: 'jhn',
    chapters: { '1': { audio: 'https://openbible.com/audio/msb/MSB_43_Jhn_001_D.mp3', duration: 382.43, verses: [[49, 354.65, 361.07], [50, 361.85, 371.25], [51, 371.51, 382.25]] } },
  });

  it('passes the guard', () => {
    expect(isBookTimings(yesterday())).toBe(true);
  });

  it('is loaded and gives John 1:50 its span of then', async () => {
    forgetTimings();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.endsWith('/index.json') ? { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [1] } } : yesterday();
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }),
    );
    try {
      const book = await loadBookTimings('jhn');
      expect(book).not.toBeNull();
      const chapter = chapterTimingsNow('jhn', 1);
      expect(chapter && spanOf(chapter, 50)).toEqual({ start: 361.85, end: 371.25 });
      expect(chapter && verseAt(chapter, 371.3)).toBe(50);
    } finally {
      vi.unstubAllGlobals();
      forgetTimings();
    }
  });
});

describe('isTimingsIndex', () => {
  it('accepts the empty index and one that lists chapters', () => {
    expect(isTimingsIndex({ v: 1, edition: 'msb-david', voice: 'David', books: {} })).toBe(true);
    expect(isTimingsIndex({ v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [1, 2, 21] } })).toBe(true);
  });

  it('refuses a wrong version, no books, and chapters that are not rising whole numbers', () => {
    expect(isTimingsIndex({ v: 2, edition: 'msb-david', voice: 'David', books: {} })).toBe(false);
    expect(isTimingsIndex({ v: 1, edition: 'msb-david', voice: 'David' })).toBe(false);
    expect(isTimingsIndex({ v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [2, 1] } })).toBe(false);
    expect(isTimingsIndex({ v: 1, edition: 'msb-david', voice: 'David', books: { jhn: ['1'] } })).toBe(false);
    expect(isTimingsIndex({ v: 1, edition: 'msb-david', voice: 'David', books: { jhn: 3 } })).toBe(false);
    expect(isTimingsIndex(null)).toBe(false);
    expect(isTimingsIndex('<html>')).toBe(false);
  });
});

describe('verseAt and spanOf', () => {
  const chapter: ChapterTimings = { audio: 'https://openbible.com/audio/msb/MSB_43_Jhn_003_D.mp3', duration: 40, verses: [[1, 4.2, 12.86], [2, 14, 27.31]] };

  it('gives null before the first verse starts: the narrator\'s chapter title', () => {
    expect(verseAt(chapter, 0)).toBeNull();
    expect(verseAt(chapter, 4.19)).toBeNull();
  });

  it('gives verse 1 from its start, and inside it', () => {
    expect(verseAt(chapter, 4.2)).toBe(1);
    expect(verseAt(chapter, 8)).toBe(1);
  });

  it('keeps verse 1 in a gap before verse 2', () => {
    expect(verseAt(chapter, 13)).toBe(1);
    expect(verseAt(chapter, 13.99)).toBe(1);
  });

  it('gives verse 2 at exactly its start', () => {
    expect(verseAt(chapter, 14)).toBe(2);
  });

  it('keeps the last verse after its end', () => {
    expect(verseAt(chapter, 27.31)).toBe(2);
    expect(verseAt(chapter, 39)).toBe(2);
  });

  it('gives null for a time that is not a number', () => {
    expect(verseAt(chapter, Number.NaN)).toBeNull();
  });

  it('gives a verse\'s start and end, and null for a verse not in the file', () => {
    expect(spanOf(chapter, 2)).toEqual({ start: 14, end: 27.31 });
    expect(spanOf(chapter, 1)).toEqual({ start: 4.2, end: 12.86 });
    expect(spanOf(chapter, 3)).toBeNull();
    expect(spanOf(chapter, 0)).toBeNull();
  });
});

describe('the loader', () => {
  const INDEX = { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [3] } };
  let files: Record<string, { status?: number; body: string }>;
  let asked: string[];

  beforeEach(() => {
    forgetTimings();
    asked = [];
    files = {
      '/data/audio/msb-david/index.json': { body: JSON.stringify(INDEX) },
      '/data/audio/msb-david/jhn.json': { body: JSON.stringify(example()) },
    };
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const path = String(input);
      asked.push(path);
      const file = files[path];
      if (!file) return new Response('not found', { status: 404 });
      return new Response(file.body, { status: file.status ?? 200 });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the index once and remembers it', async () => {
    expect(await loadTimingsIndex()).toEqual(INDEX);
    expect(await loadTimingsIndex()).toEqual(INDEX);
    expect(asked).toEqual(['/data/audio/msb-david/index.json']);
  });

  it('resolves the book, with chapterTimingsNow null before the load and the chapter after it', async () => {
    expect(chapterTimingsNow('jhn', 3)).toBeNull();
    const book = await loadBookTimings('jhn');
    expect(book).toEqual(example());
    expect(chapterTimingsNow('jhn', 3)).toEqual(example().chapters['3']);
    expect(chapterTimingsNow('jhn', 4)).toBeNull();
    expect(chapterTimingsNow('rom', 3)).toBeNull();
  });

  it('makes no second fetch for a second call, even one made while the first is still waiting', async () => {
    const [a, b] = await Promise.all([loadBookTimings('jhn'), loadBookTimings('jhn')]);
    expect(a).toEqual(b);
    await loadBookTimings('jhn');
    expect(asked).toEqual(['/data/audio/msb-david/index.json', '/data/audio/msb-david/jhn.json']);
  });

  it('does not fetch a book the index does not list', async () => {
    expect(await loadBookTimings('rom')).toBeNull();
    expect(asked).toEqual(['/data/audio/msb-david/index.json']);
    expect(chapterTimingsNow('rom', 1)).toBeNull();
  });

  it('resolves null for a 404 book file, and does not throw', async () => {
    delete files['/data/audio/msb-david/jhn.json'];
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
    expect(chapterTimingsNow('jhn', 3)).toBeNull();
  });

  it('resolves null for an HTML body: a server\'s index.html answering for a missing file', async () => {
    files['/data/audio/msb-david/jhn.json'] = { body: '<!doctype html><html><body>Lampas</body></html>' };
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
    files['/data/audio/msb-david/index.json'] = { body: '<!doctype html><html></html>' };
    forgetTimings();
    await expect(loadTimingsIndex()).resolves.toBeNull();
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
  });

  it('resolves null for a file that fails the guard', async () => {
    files['/data/audio/msb-david/jhn.json'] = { body: JSON.stringify(withVerses([[1, 9, 3]])) };
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
    expect(chapterTimingsNow('jhn', 3)).toBeNull();
  });

  it('resolves null when the index fails its guard, and for the book too', async () => {
    files['/data/audio/msb-david/index.json'] = { body: JSON.stringify({ v: 9 }) };
    await expect(loadTimingsIndex()).resolves.toBeNull();
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
    expect(asked).toEqual(['/data/audio/msb-david/index.json']);
  });

  it('resolves null when the fetch itself fails, and does not throw', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(loadTimingsIndex()).resolves.toBeNull();
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
  });

  it('resolves null for a file that the server refuses even when its body is JSON', async () => {
    files['/data/audio/msb-david/jhn.json'] = { status: 500, body: JSON.stringify(example()) };
    await expect(loadBookTimings('jhn')).resolves.toBeNull();
  });
});

describe('the worker\'s rule for /data/audio/', () => {
  type Route = { match: (ctx: { url: URL; request: Request }) => boolean; handler: unknown };
  const registered: Route[] = [];
  class CacheFirst {
    options: { cacheName: string };
    constructor(options: { cacheName: string }) {
      this.options = options;
    }
  }
  class NetworkFirst extends CacheFirst {
    networkTimeoutSeconds: number | undefined;
    constructor(options: { cacheName: string; networkTimeoutSeconds?: number }) {
      super(options);
      this.networkTimeoutSeconds = options.networkTimeoutSeconds;
    }
  }

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }));
    vi.doMock('workbox-routing', () => ({
      NavigationRoute: class {},
      registerRoute: (match: Route['match'], handler: unknown) => registered.push({ match, handler }),
    }));
    vi.doMock('workbox-strategies', () => ({ CacheFirst, NetworkFirst }));
    Object.assign(window, { skipWaiting: vi.fn(), clients: { claim: vi.fn() }, __WB_MANIFEST: [] });
    Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [], open: async () => ({}), delete: async () => true } });
    await import('../../src/sw');
  });

  /** The first route that answers a GET of this path, as the worker would pick it (the first registered wins). */
  const routeFor = (path: string): Route | undefined => {
    const url = new URL(path, 'http://localhost');
    const request = new Request(url);
    return registered.find((r) => typeof r.match === 'function' && r.match({ url, request }));
  };

  it.each(['/data/audio/msb-david/index.json', '/data/audio/msb-david/jhn.json'])('answers %s network first, in the data cache, waiting 5 s for the network', (path) => {
    const route = routeFor(path);
    expect(route?.handler).toBeInstanceOf(NetworkFirst);
    expect(route?.handler).toMatchObject({ options: { cacheName: 'lampas-data-v4' }, networkTimeoutSeconds: 5 });
  });

  it('keeps the cache-first rule for the rest of /data/, and never asks it about /data/audio/', () => {
    const cacheFirst = registered.filter((r) => r.handler instanceof CacheFirst && !(r.handler instanceof NetworkFirst));
    const url = new URL('/data/audio/msb-david/jhn.json', 'http://localhost');
    const request = new Request(url);
    expect(cacheFirst.length).toBeGreaterThan(0);
    // the cache-first rule that takes the rest of /data/ comes after the network-first rule for /data/audio/, so it is never reached
    const first = registered.findIndex((r) => typeof r.match === 'function' && r.match({ url, request }));
    const cacheFirstData = registered.findIndex((r) => typeof r.match === 'function' && r.handler instanceof CacheFirst && !(r.handler instanceof NetworkFirst) && r.match({ url, request }));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(cacheFirstData);
    expect(routeFor('/data/jhn/3.json')?.handler).toBeInstanceOf(CacheFirst);
    expect(routeFor('/data/jhn/3.json')?.handler).not.toBeInstanceOf(NetworkFirst);
  });

  it('does not answer a POST', () => {
    const url = new URL('/data/audio/msb-david/index.json', 'http://localhost');
    expect(registered.some((r) => typeof r.match === 'function' && r.handler instanceof NetworkFirst && r.match({ url, request: new Request(url, { method: 'POST' }) }))).toBe(false);
  });
});

describe('the precache', () => {
  it('leaves /data/audio/ out: no glob pattern reaches a file under it', async () => {
    const { injectManifestOptions } = await import('../../pwa-precache');
    const { globSync } = await import('node:fs');
    const matched = globSync(injectManifestOptions.globPatterns, { cwd: 'public' }).filter((p) => p.startsWith('data/audio/'));
    expect(matched).toEqual([]);
  });
});
