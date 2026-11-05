import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CANON_INDEX, BOOK_INDEX } from '../../src/data/bookIndex';
import { chapterUrl } from '../../src/data/chapter';
import { SERMON_INDEX, sermonBookUrl, type SermonIndex } from '../../src/data/sermonIndex';
import { db } from '../../src/data/db';
import { DATA_CACHE } from '../../src/dataCache';
import { ASYNC_WAIT_MS } from '../support/timeouts';
import {
  OFFLINE_CONCURRENCY,
  getOfflineScope,
  offlineProgress,
  offlineUrls,
  onOfflineProgress,
  runOfflineCopy,
  setOfflineScope,
  startOfflineCopy,
  type OfflineProgress,
  type OfflineScope,
} from '../../src/data/offlineCopy';

// The offline copy (mw-lcv9z3g.1): every chapter of a scope is fetched through the reader's own versioned address, so the worker's serveChapter
// keeps it; what the data cache already holds is not fetched again, three at a time, paused offline and resumed online.

class FakeCache {
  entries = new Map<string, string>();
  match = async (url: string) => (this.entries.has(url) ? new Response(this.entries.get(url)) : undefined);
}

interface Setup {
  cache: FakeCache;
  caches: Pick<CacheStorage, 'open'>;
  opened: string[];
  events: EventTarget;
  calls: string[];
  fetcher: typeof fetch;
}

/** A fake fetch that, like the worker's serveChapter, keeps what it fetches in the fake cache. `behave` may fail or hold a fetch. */
function setup(behave: (url: string, call: number) => Promise<void> | void = () => undefined): Setup {
  const cache = new FakeCache();
  const opened: string[] = [];
  const caches = {
    open: async (name: string) => {
      opened.push(name);
      return cache as unknown as Cache;
    },
  };
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    await behave(url, calls.filter((c) => c === url).length);
    cache.entries.set(url, `body of ${url}`);
    return new Response(`body of ${url}`);
  }) as typeof fetch;
  return { cache, caches, opened, events: new EventTarget(), calls, fetcher };
}

/** The sermon files are tried on their own below; the tests about chapters give no sermons, so their counts stay the chapters'. */
const NO_SERMONS: SermonIndex = { sources: [] };
const chaptersOnly = (scope: OfflineScope, index = CANON_INDEX) => offlineUrls(scope, index, NO_SERMONS);
const deps = (s: Setup) => ({ caches: s.caches, fetcher: s.fetcher, events: s.events, isOnline: () => true, sermons: NO_SERMONS });

const timeout = ASYNC_WAIT_MS;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await db.settings.clear();
});

describe('offlineUrls', () => {
  it('lists nothing for none', () => {
    expect(chaptersOnly('none')).toEqual([]);
  });

  it('lists exactly the 260 chapters of the New Testament by the reader\'s own address, each with its fingerprint', () => {
    const urls = chaptersOnly('nt');
    expect(urls).toHaveLength(260);
    expect(urls).toEqual(BOOK_INDEX.books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => chapterUrl(b.code, i + 1))));
    for (const url of urls) expect(url).toMatch(/^\/data\/[0-9a-z]+\/\d+\.json\?v=[0-9a-f]{12}$/);
    expect(urls).toContain(`/data/jhn/1.json?v=${BOOK_INDEX.books.find((b) => b.code === 'jhn')!.fingerprints[0]}`);
  });

  it('lists every chapter of all 66 books and the two Hebrew word lists for the whole Bible', () => {
    const urls = chaptersOnly('all');
    const chapters = CANON_INDEX.books.reduce((n, b) => n + b.chapters, 0);
    expect(urls).toHaveLength(chapters + 2);
    expect(urls.slice(0, chapters)).toEqual(CANON_INDEX.books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => chapterUrl(b.code, i + 1))));
    expect(urls.slice(chapters)).toEqual(['/data/lexicon-hbo.json', '/data/frequency-hbo.json']);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('takes the fingerprints from the index it is given', () => {
    const index = { books: [{ code: 'phm', name: 'Philemon', chapters: 1, verses: [25], fingerprints: ['0123456789ab'] }] };
    expect(chaptersOnly('nt', index)).toEqual(['/data/phm/1.json?v=0123456789ab']);
  });
});

const source = (id: string, books: string[], fingerprint: string) => ({ id, name: id, kind: 'sermons', licence: 'L', credit: 'C', homepage: 'https://x', rows: 1, books, fingerprint });
const SERMONS: SermonIndex = { sources: [source('spurgeon-ccel', ['gen', 'psa', 'mat', 'rom'], '0123456789ab'), source('other', ['jhn'], 'ba9876543210')] };

describe('the sermon files in the offline copy (mw-qtu3zvz.1)', () => {
  it('asks for a book file of each source by its source\'s fingerprint, as the worker keeps it', () => {
    expect(sermonBookUrl('spurgeon-ccel', 'rom', SERMONS)).toBe('/sermons/spurgeon-ccel/rom.json?v=0123456789ab');
    expect(sermonBookUrl('other', 'jhn', SERMONS)).toBe('/sermons/other/jhn.json?v=ba9876543210');
  });

  it('adds the books of the New Testament to nt and every book to all, after the chapters and the Hebrew lists, in source order', () => {
    expect(offlineUrls('none', CANON_INDEX, SERMONS)).toEqual([]);
    const nt = offlineUrls('nt', CANON_INDEX, SERMONS);
    expect(nt.slice(0, 260)).toEqual(chaptersOnly('nt'));
    expect(nt.slice(260)).toEqual(['/sermons/spurgeon-ccel/mat.json?v=0123456789ab', '/sermons/spurgeon-ccel/rom.json?v=0123456789ab', '/sermons/other/jhn.json?v=ba9876543210']);
    const all = offlineUrls('all', CANON_INDEX, SERMONS);
    const chapters = chaptersOnly('all');
    expect(all.slice(0, chapters.length)).toEqual(chapters);
    expect(all.slice(chapters.length)).toEqual([
      '/sermons/spurgeon-ccel/gen.json?v=0123456789ab',
      '/sermons/spurgeon-ccel/psa.json?v=0123456789ab',
      '/sermons/spurgeon-ccel/mat.json?v=0123456789ab',
      '/sermons/spurgeon-ccel/rom.json?v=0123456789ab',
      '/sermons/other/jhn.json?v=ba9876543210',
    ]);
  });

  it('takes the bundled index unless one is given: the files public/sermons/index.json lists', () => {
    expect(SERMON_INDEX.sources.length).toBeGreaterThan(0);
    const urls = offlineUrls('all');
    for (const s of SERMON_INDEX.sources) for (const book of s.books) expect(urls).toContain(`/sermons/${s.id}/${book}.json?v=${s.fingerprint}`);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('fetches a changed fingerprint\'s files and no others: the fingerprint is the address\'s check', async () => {
    const s = setup();
    await runOfflineCopy('nt', { ...deps(s), index: { books: [] }, sermons: SERMONS });
    expect(s.calls).toEqual(offlineUrls('nt', { books: [] }, SERMONS));
    expect(s.calls).toHaveLength(3);
    s.calls.length = 0;
    expect(await runOfflineCopy('nt', { ...deps(s), index: { books: [] }, sermons: SERMONS })).toMatchObject({ done: 3, total: 3 });
    expect(s.calls).toEqual([]);
    const changed: SermonIndex = { sources: [source('spurgeon-ccel', ['gen', 'psa', 'mat', 'rom'], 'ffffffffffff'), SERMONS.sources[1]] };
    await runOfflineCopy('nt', { ...deps(s), index: { books: [] }, sermons: changed });
    expect(s.calls).toEqual(['/sermons/spurgeon-ccel/mat.json?v=ffffffffffff', '/sermons/spurgeon-ccel/rom.json?v=ffffffffffff']);
  });
});

describe('runOfflineCopy', () => {
  it('fetches only what the data cache lacks and reports progress ending at done === total', async () => {
    const s = setup();
    const urls = chaptersOnly('nt');
    for (const url of urls.slice(0, 10)) s.cache.entries.set(url, 'kept');
    const seen: OfflineProgress[] = [];
    const stop = onOfflineProgress((p) => seen.push(p));
    const end = await runOfflineCopy('nt', deps(s));
    stop();
    expect(s.opened.every((name) => name === DATA_CACHE)).toBe(true);
    expect(s.calls).toHaveLength(250);
    expect(s.calls).toEqual(urls.slice(10));
    expect(end).toMatchObject({ done: 260, total: 260, failed: [] });
    expect(end.bytes).toBeGreaterThan(0);
    expect(seen[0]).toMatchObject({ done: 10, total: 260, bytes: 0 });
    expect(seen.at(-1)).toEqual(end);
    expect(seen.map((p) => p.done)).toEqual([...seen.map((p) => p.done)].sort((a, b) => a - b));
    expect(offlineProgress()).toEqual(end);
  });

  it('fetches nothing for a scope that is already kept', async () => {
    const s = setup();
    await runOfflineCopy('nt', deps(s));
    s.calls.length = 0;
    const end = await runOfflineCopy('nt', deps(s));
    expect(s.calls).toEqual([]);
    expect(end).toMatchObject({ done: 260, total: 260 });
  });

  it('has at most three fetches in flight', async () => {
    let flying = 0;
    let most = 0;
    const s = setup(async () => {
      flying++;
      most = Math.max(most, flying);
      await tick();
      flying--;
    });
    await runOfflineCopy('nt', deps(s));
    expect(OFFLINE_CONCURRENCY).toBe(3);
    expect(most).toBe(3);
  });

  it('fetches the two Hebrew lists plain, with the whole Bible', async () => {
    const s = setup();
    const end = await runOfflineCopy('all', deps(s));
    expect(s.calls).toContain('/data/lexicon-hbo.json');
    expect(s.calls).toContain('/data/frequency-hbo.json');
    expect(end.done).toBe(end.total);
  });

  it('passes the fetch a signal, so a fetch that never answers is given up on', async () => {
    const s = setup();
    const fetcher = vi.fn(s.fetcher);
    await runOfflineCopy('nt', { ...deps(s), fetcher: fetcher as unknown as typeof fetch, index: { books: BOOK_INDEX.books.slice(0, 1) } });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ signal: expect.any(AbortSignal) });
  });

  it('pauses on offline, starting no new fetch, and resumes on online', async () => {
    const held: Array<() => void> = [];
    let started = 0;
    const s = setup(
      () =>
        new Promise<void>((resolve) => {
          if (started++ < 3) held.push(resolve);
          else resolve();
        }),
    );
    const run = runOfflineCopy('nt', deps(s));
    await vi.waitFor(() => expect(s.calls).toHaveLength(3), { timeout });
    s.events.dispatchEvent(new Event('offline'));
    expect(offlineProgress().paused).toBe(true);
    held.splice(0).forEach((release) => release());
    await tick();
    await tick();
    expect(s.calls).toHaveLength(3);
    s.events.dispatchEvent(new Event('online'));
    const end = await run;
    expect(end).toMatchObject({ done: 260, total: 260, failed: [], paused: false });
    expect(s.calls).toHaveLength(260);
  });

  it('does not count a fetch that failed because the phone went offline against its retry', async () => {
    const urls = chaptersOnly('nt');
    const s = setup((url, call) => {
      if (url === urls[0] && call === 1) {
        s.events.dispatchEvent(new Event('offline'));
        throw new TypeError('Failed to fetch');
      }
    });
    const run = runOfflineCopy('nt', { ...deps(s), index: { books: BOOK_INDEX.books.slice(0, 1) } });
    await tick();
    await tick();
    expect(offlineProgress().paused).toBe(true);
    s.events.dispatchEvent(new Event('online'));
    const end = await run;
    expect(end.failed).toEqual([]);
    expect(end.done).toBe(end.total);
    expect(s.calls.filter((c) => c === urls[0])).toHaveLength(2);
  });

  it('starts paused when the phone is offline', async () => {
    const s = setup();
    let online = false;
    const run = runOfflineCopy('nt', { ...deps(s), isOnline: () => online, index: { books: BOOK_INDEX.books.slice(0, 1) } });
    await tick();
    expect(s.calls).toEqual([]);
    online = true;
    s.events.dispatchEvent(new Event('online'));
    expect((await run).done).toBe(BOOK_INDEX.books[0].chapters);
  });

  it('retries a failed fetch once, and counts and reports one that fails twice, never throwing', async () => {
    const urls = chaptersOnly('nt');
    const flaky = urls[5];
    const broken = urls[9];
    const s = setup((url, call) => {
      if (url === flaky && call === 1) throw new TypeError('Failed to fetch');
      if (url === broken) throw new TypeError('Failed to fetch');
    });
    const end = await runOfflineCopy('nt', deps(s));
    expect(s.calls.filter((c) => c === flaky)).toHaveLength(2);
    expect(s.calls.filter((c) => c === broken)).toHaveLength(2);
    expect(end.failed).toEqual([broken]);
    expect(end.done).toBe(end.total);
    expect(end.total).toBe(260);
  });

  it('counts a refusal (not ok) as a failure too', async () => {
    const s = setup();
    const refusing = (async (input: RequestInfo | URL) => {
      s.calls.push(String(input));
      return new Response('nope', { status: 404 });
    }) as typeof fetch;
    const end = await runOfflineCopy('nt', { ...deps(s), fetcher: refusing, index: { books: BOOK_INDEX.books.slice(0, 1) } });
    expect(end.failed).toHaveLength(BOOK_INDEX.books[0].chapters);
    expect(s.calls).toHaveLength(BOOK_INDEX.books[0].chapters * 2);
  });

  it('does nothing for none', async () => {
    const s = setup();
    expect(await runOfflineCopy('none', deps(s))).toMatchObject({ done: 0, total: 0, failed: [] });
    expect(s.calls).toEqual([]);
  });

  it('stops when its signal aborts', async () => {
    const controller = new AbortController();
    const s = setup(() => {
      if (s.calls.length >= 6) controller.abort();
    });
    const end = await runOfflineCopy('nt', { ...deps(s), signal: controller.signal });
    expect(end.done).toBeLessThan(260);
    expect(s.calls.length).toBeLessThan(20);
  });
});

describe('the chosen scope', () => {
  it('is none until one is chosen', async () => {
    expect(await getOfflineScope()).toBe('none');
  });

  it('survives a reload: it is read back from the settings store', async () => {
    await setOfflineScope('nt');
    expect((await db.settings.get('offlineCopy'))?.value).toBe('nt');
    db.close();
    await db.open();
    expect(await getOfflineScope()).toBe('nt');
    await setOfflineScope('all');
    expect(await getOfflineScope()).toBe('all');
    await setOfflineScope('none');
    expect(await getOfflineScope()).toBe('none');
  });

  it('is none when the saved value is not a scope', async () => {
    await db.settings.put({ key: 'offlineCopy', value: 'everything' });
    expect(await getOfflineScope()).toBe('none');
  });

  it('is read at start: startOfflineCopy copies the saved scope', async () => {
    await setOfflineScope('nt');
    const s = setup();
    const end = await startOfflineCopy({ ...deps(s), index: { books: BOOK_INDEX.books.slice(0, 2) } });
    const chapters = BOOK_INDEX.books[0].chapters + BOOK_INDEX.books[1].chapters;
    expect(end).toMatchObject({ done: chapters, total: chapters });
    expect(s.calls).toHaveLength(chapters);
  });
});
