// A Hebrew word list the deploy changes reaches a phone that already holds the old copy (mw-fnvjof.17.41). lexicon-hbo.json and frequency-hbo.json are not in the
// precache; the worker used to keep them CacheFirst under their plain address for good, so a phone that had loaded the Hebrew lexicon before batch 465 still
// answered a #/?word= link by יָרָה with "is not in Lampas". They are asked for as /data/<list>.json?v=<fingerprint> now (index.json `lists`), kept by serveChapter.
//
// The harness runs the app's own fetch through the routes src/sw.ts registers (workbox mocked as in sw-data-route.test.ts), over a fake data cache that holds
// what a phone held before: the plain address, the old file. A Request given to fetch is the worker's own trip to the network.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CANON_INDEX } from '../../src/data/bookIndex';
import { forgetFrequency, rankOf } from '../../src/data/frequency';
import { forgetLexicon, loadLexicon, lookupLemma, type LemmaLexicon } from '../../src/data/lexicon';
import { runOfflineCopy } from '../../src/data/offlineCopy';
import { DATA_CACHE, DATA_CACHE_VERSION } from '../../src/dataCache';

type Route = { match: (ctx: { url: URL; request: Request }) => boolean; handler: unknown };
const registered: Route[] = [];

class FakeCache {
  entries = new Map<string, string>();
  match = async (request: Request | string) => {
    const body = this.entries.get(typeof request === 'string' ? request : request.url);
    return body === undefined ? undefined : new Response(body);
  };
  put = async (request: Request, response: Response) => void this.entries.set(request.url, await response.text());
  keys = async (request?: Request, options?: CacheQueryOptions) =>
    [...this.entries.keys()]
      .filter((url) => !request || (options?.ignoreSearch ? new URL(url).pathname === new URL(request.url).pathname : url === request.url))
      .map((url) => new Request(url));
  delete = async (request: Request) => this.entries.delete(request.url);
}
const stores = new Map<string, FakeCache>();
const store = (name: string): FakeCache => {
  let cache = stores.get(name);
  if (!cache) stores.set(name, (cache = new FakeCache()));
  return cache;
};

class CacheFirst {
  options: { cacheName: string };
  constructor(options: { cacheName: string }) {
    this.options = options;
  }
  async handle({ request }: { request: Request }): Promise<Response> {
    const cache = store(this.options.cacheName);
    const kept = await cache.match(request);
    if (kept) return kept;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }
}

vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }));
vi.mock('workbox-routing', () => ({
  NavigationRoute: class {},
  registerRoute: (match: Route['match'], handler: unknown) => registered.push({ match, handler }),
}));
vi.mock('workbox-strategies', () => ({ CacheFirst, NetworkFirst: class {} }));

beforeAll(async () => {
  Object.assign(window, { skipWaiting: vi.fn(), clients: { claim: vi.fn() }, __WB_MANIFEST: [] });
  Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [...stores.keys()], open: async (name: string) => store(name), delete: async () => true } });
  await import('../../src/sw');
});

const hbo = (file: string): LemmaLexicon => JSON.parse(readFileSync(`public/data/${file}`, 'utf8')) as LemmaLexicon;
/** The lexicon as a phone held it before batch 465: no spelling TBESH gives a number the text never uses. */
const oldLexicon = (): LemmaLexicon => Object.fromEntries(Object.entries(hbo('lexicon-hbo.json')).filter(([, entry]) => !entry.v));

/** What the network was asked for by the worker, by address. */
let network: string[] = [];

/** The server: the committed file, whatever ?v= says. */
const server = (request: Request): Response => {
  const url = new URL(request.url);
  network.push(url.pathname + url.search);
  return new Response(readFileSync(`public${url.pathname}`, 'utf8'), { status: 200 });
};

/** The page's fetch, answered as the browser does: the first registered route that takes it answers; a Request is the worker's own trip to the server. */
const page = (online: boolean) => async (input: RequestInfo | URL): Promise<Response> => {
  if (input instanceof Request) {
    if (!online) throw new TypeError('Failed to fetch');
    return server(input);
  }
  const request = new Request(new URL(String(input), 'http://localhost'));
  const url = new URL(request.url);
  const route = registered.find((r) => typeof r.match === 'function' && r.match({ url, request }));
  if (!route) return fetch(request);
  const handler = route.handler as CacheFirst | ((ctx: { request: Request }) => Promise<Response>);
  return handler instanceof CacheFirst ? handler.handle({ request }) : handler({ request });
};

beforeEach(() => {
  stores.clear();
  network = [];
  forgetLexicon();
  forgetFrequency();
  vi.stubGlobal('fetch', page(true));
});
afterEach(() => vi.unstubAllGlobals());

const keepOld = (): FakeCache => {
  const cache = store(DATA_CACHE);
  cache.entries.set('http://localhost/data/lexicon-hbo.json', JSON.stringify(oldLexicon()));
  return cache;
};

describe('the fingerprints of the Hebrew lists in index.json', () => {
  it('are the fingerprints of the lists committed, so a list changed without them fails here (npm run data:build:ot writes both)', () => {
    for (const list of ['lexicon-hbo', 'frequency-hbo'] as const) {
      const fingerprint = createHash('sha256').update(readFileSync(`public/data/${list}.json`)).digest('hex').slice(0, 12);
      expect(CANON_INDEX.lists?.[list], list).toBe(fingerprint);
    }
  });
});

describe('a phone that holds yesterday\'s Hebrew lexicon', () => {
  it('has the old copy to begin with: no יָרָה', () => {
    expect(oldLexicon()['יָרָה']).toBeUndefined();
    expect(hbo('lexicon-hbo.json')['יָרָה']).toMatchObject({ s: 'H3384', v: true });
  });

  it('finds יָרָה (H3384) once the build it loads carries the new fingerprint', async () => {
    keepOld();
    const entry = await lookupLemma('יָרָה', 'hbo');
    expect(entry).toMatchObject({ s: 'H3384', g: 'to show' });
  });

  it('is fetched once, kept under the fingerprint, and the old copy is dropped', async () => {
    const cache = keepOld();
    await loadLexicon('hbo');
    const fingerprint = CANON_INDEX.lists?.['lexicon-hbo'];
    expect(fingerprint).toMatch(/^[0-9a-f]{12}$/);
    expect(network).toEqual([`/data/lexicon-hbo.json?v=${fingerprint}`]);
    expect([...cache.entries.keys()]).toEqual([`http://localhost/data/lexicon-hbo.json?v=${fingerprint}`]);
  });

  it('asks the network for nothing on a second load with the fingerprint unchanged', async () => {
    keepOld();
    await loadLexicon('hbo');
    await rankOf('H853', 'hbo');
    expect(network).toHaveLength(2); // the lexicon and the frequencies, once each
    network = [];
    forgetLexicon();
    forgetFrequency();
    expect((await lookupLemma('יָרָה', 'hbo'))?.s).toBe('H3384');
    expect(await rankOf('H853', 'hbo')).toBeGreaterThan(0);
    expect(network).toEqual([]);
  });

  it('still opens the word sheet offline once the list is kept', async () => {
    keepOld();
    await loadLexicon('hbo');
    network = [];
    forgetLexicon();
    vi.stubGlobal('fetch', page(false));
    expect((await lookupLemma('יָרָה', 'hbo'))?.s).toBe('H3384');
  });

  it('shows the old copy offline when the new list was never fetched, rather than nothing', async () => {
    keepOld();
    vi.stubGlobal('fetch', page(false));
    expect(Object.keys(await loadLexicon('hbo')).length).toBe(Object.keys(oldLexicon()).length);
  });

  it('keeps a chapter already read: the cache is the same one', async () => {
    expect(DATA_CACHE_VERSION).toBe(4);
    expect(DATA_CACHE).toBe('lampas-data-v4');
    const cache = keepOld();
    const chapter = 'http://localhost/data/jhn/1.json?v=' + CANON_INDEX.books.find((b) => b.code === 'jhn')!.fingerprints[0];
    cache.entries.set(chapter, '{"kept":true}');
    await loadLexicon('hbo');
    expect(cache.entries.get(chapter)).toBe('{"kept":true}');
  });

  it('is kept by the offline copy under the address the page asks for', async () => {
    const cache = keepOld();
    const asked: string[] = [];
    const caches = { open: async () => cache as unknown as Cache };
    const fetcher = (async (input: RequestInfo | URL) => {
      asked.push(String(input));
      return fetch(input);
    }) as typeof fetch;
    await runOfflineCopy('all', { caches, fetcher, index: { books: [], lists: CANON_INDEX.lists }, sermons: { sources: [] } as never, isOnline: () => true });
    const lists = asked.filter((url) => url.includes('-hbo'));
    expect(lists).toEqual([`/data/lexicon-hbo.json?v=${CANON_INDEX.lists?.['lexicon-hbo']}`, `/data/frequency-hbo.json?v=${CANON_INDEX.lists?.['frequency-hbo']}`]);
  });
});
