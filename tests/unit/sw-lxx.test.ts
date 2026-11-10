// The worker keeps the Septuagint (mw-lcv9z3g.6): a chapter /data-lxx/<code>/<n>.json?v=<fingerprint> is kept under that address and a changed fingerprint replaces its old copy; the index and the Greek lexicon, which have no
// fingerprint, go network first and are kept, so both are read offline. The harness is sw-hebrew-lists.test.ts's: the app's own fetch runs through the routes src/sw.ts registers (workbox mocked), over a fake data cache.
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LXX_INDEX_URL, LXX_LEXICON_URL, loadLxxIndex, forgetLxxIndex } from '../../src/data/lxxChapter';
import { runOfflineCopy } from '../../src/data/offlineCopy';
import { DATA_CACHE } from '../../src/dataCache';

type Route = { match: (ctx: { url: URL; request: Request }) => boolean; handler: unknown };
const registered: Route[] = [];

class FakeCache {
  entries = new Map<string, string>();
  match = async (request: Request | string) => {
    // like the browser's cache, a string address is read against the page's origin
    const body = this.entries.get(typeof request === 'string' ? new URL(request, 'http://localhost').href : request.url);
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
/** workbox's NetworkFirst, as far as the worker uses it: the network's answer is kept and returned; with no network the kept copy is. */
class NetworkFirst extends CacheFirst {
  async handle({ request }: { request: Request }): Promise<Response> {
    const cache = store(this.options.cacheName);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const kept = await cache.match(request);
      if (kept) return kept;
      throw error;
    }
  }
}

vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }));
vi.mock('workbox-routing', () => ({
  NavigationRoute: class {},
  registerRoute: (match: Route['match'], handler: unknown) => registered.push({ match, handler }),
}));
vi.mock('workbox-strategies', () => ({ CacheFirst, NetworkFirst }));

beforeAll(async () => {
  Object.assign(window, { skipWaiting: vi.fn(), clients: { claim: vi.fn() }, __WB_MANIFEST: [] });
  Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [...stores.keys()], open: async (name: string) => store(name), delete: async () => true } });
  await import('../../src/sw');
});

/** What the server holds now, by path; what the worker asked the network for. */
let server: Record<string, string> = {};
let network: string[] = [];
let online = true;

const page = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (input instanceof Request) {
    if (!online) throw new TypeError('Failed to fetch');
    const url = new URL(input.url);
    network.push(url.pathname + url.search);
    const body = server[url.pathname];
    return body === undefined ? new Response('not found', { status: 404 }) : new Response(body);
  }
  const request = new Request(new URL(String(input), 'http://localhost'), init);
  const url = new URL(request.url);
  const route = registered.find((r) => typeof r.match === 'function' && r.match({ url, request }));
  if (!route) throw new Error(`no route for ${String(input)}`);
  const handler = route.handler as CacheFirst | ((ctx: { request: Request }) => Promise<Response>);
  return handler instanceof CacheFirst ? handler.handle({ request }) : handler({ request });
};

const indexOf = (fingerprint: string) =>
  JSON.stringify({ sources: {}, books: [{ code: 'gen', name: 'Genesis', chapters: 1, verses: [31], fingerprints: [fingerprint], lang: 'grc', lampas: 'gen', lampasChapters: [[1]] }] });

beforeEach(() => {
  stores.clear();
  network = [];
  online = true;
  forgetLxxIndex();
  server = { '/data-lxx/index.json': indexOf('aaaaaaaaaaaa'), '/data-lxx/lexicon-grc-lxx.json': '{}', '/data-lxx/gen/1.json': 'chapter v1' };
  vi.stubGlobal('fetch', page);
});
afterEach(() => vi.unstubAllGlobals());

describe('the worker\'s routes for /data-lxx/', () => {
  it('keeps a chapter asked for by its fingerprint, and serves it with no fetch the next time', async () => {
    const url = '/data-lxx/gen/1.json?v=aaaaaaaaaaaa';
    expect(await (await fetch(url)).text()).toBe('chapter v1');
    expect(await (await fetch(url)).text()).toBe('chapter v1');
    expect(network).toEqual([url]);
    expect([...store(DATA_CACHE).entries.keys()]).toEqual([`http://localhost${url}`]);
  });

  it('replaces the old copy of a chapter whose fingerprint changed', async () => {
    await fetch('/data-lxx/gen/1.json?v=aaaaaaaaaaaa');
    server['/data-lxx/gen/1.json'] = 'chapter v2';
    expect(await (await fetch('/data-lxx/gen/1.json?v=bbbbbbbbbbbb')).text()).toBe('chapter v2');
    expect([...store(DATA_CACHE).entries.keys()]).toEqual(['http://localhost/data-lxx/gen/1.json?v=bbbbbbbbbbbb']);
  });

  it('reads a kept chapter with the phone offline', async () => {
    await fetch('/data-lxx/gen/1.json?v=aaaaaaaaaaaa');
    online = false;
    expect(await (await fetch('/data-lxx/gen/1.json?v=aaaaaaaaaaaa')).text()).toBe('chapter v1');
  });

  it('asks the network first for the index and the lexicon, keeps them and reads them offline', async () => {
    expect((await (await fetch(LXX_INDEX_URL)).json()).books[0].fingerprints).toEqual(['aaaaaaaaaaaa']);
    server['/data-lxx/index.json'] = indexOf('bbbbbbbbbbbb');
    expect((await (await fetch(LXX_INDEX_URL)).json()).books[0].fingerprints).toEqual(['bbbbbbbbbbbb']);
    await fetch(LXX_LEXICON_URL);
    online = false;
    expect((await (await fetch(LXX_INDEX_URL)).json()).books[0].fingerprints).toEqual(['bbbbbbbbbbbb']);
    expect(await (await fetch(LXX_LEXICON_URL)).text()).toBe('{}');
  });

  it('is the Reader\'s own index load that the kept copy answers offline', async () => {
    await fetch(LXX_INDEX_URL);
    online = false;
    expect((await loadLxxIndex()).books[0].code).toBe('gen');
  });
});

describe('the offline copy of the Septuagint through the worker', () => {
  const run = (scope: 'lxx' | 'all' = 'lxx') => runOfflineCopy(scope, { sermons: { sources: [] }, index: { books: [] }, isOnline: () => online, events: new EventTarget() });

  it('keeps the index, every chapter and the lexicon, and reads them with the phone offline', async () => {
    const end = await run();
    expect(end).toMatchObject({ done: 3, total: 3, failed: [] });
    expect([...store(DATA_CACHE).entries.keys()].sort()).toEqual(
      ['http://localhost/data-lxx/gen/1.json?v=aaaaaaaaaaaa', 'http://localhost/data-lxx/index.json', 'http://localhost/data-lxx/lexicon-grc-lxx.json'].sort(),
    );
    online = false;
    expect(await (await fetch('/data-lxx/gen/1.json?v=aaaaaaaaaaaa')).text()).toBe('chapter v1');
  });

  it('a chapter whose fingerprint changed replaces its old copy, and nothing else is fetched again', async () => {
    await run();
    network = [];
    server['/data-lxx/index.json'] = indexOf('bbbbbbbbbbbb');
    server['/data-lxx/gen/1.json'] = 'chapter v2';
    const end = await run();
    expect(end).toMatchObject({ done: 3, total: 3, failed: [] });
    // the chapter and the lexicon go several at a time, so in no set order
    expect([...network].sort()).toEqual(['/data-lxx/gen/1.json?v=bbbbbbbbbbbb', '/data-lxx/index.json', '/data-lxx/lexicon-grc-lxx.json']);
    expect([...store(DATA_CACHE).entries.keys()].filter((key) => key.includes('/gen/1'))).toEqual(['http://localhost/data-lxx/gen/1.json?v=bbbbbbbbbbbb']);
    network = [];
    await run();
    expect(network).toEqual(['/data-lxx/index.json']);
  });
});
