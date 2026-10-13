import { describe, expect, it } from 'vitest';
import { DATA_CACHE, dropOldDataCaches, isVersionedChapter, serveChapter } from '../../src/dataCache';

function fakeCaches(names: string[]) {
  const held = new Set(names);
  return {
    held,
    keys: async () => [...held],
    delete: async (name: string) => held.delete(name),
  };
}

describe('dropOldDataCaches', () => {
  it('deletes the older chapter-data caches, keeps the current one and the others', async () => {
    const caches = fakeCaches(['lampas-data', 'lampas-data-v1', DATA_CACHE, 'workbox-precache-v2-x']);
    expect(await dropOldDataCaches(caches)).toEqual(['lampas-data', 'lampas-data-v1']);
    expect([...caches.held]).toEqual([DATA_CACHE, 'workbox-precache-v2-x']);
  });

  it('names a version other than the unversioned cache the first builds used', () => {
    expect(DATA_CACHE).not.toBe('lampas-data');
  });
});

// A kept chapter lives under /data/<book>/<n>.json?v=<fingerprint> (mw-5r3p30.276): an update that leaves a chapter's fingerprint alone
// serves the kept copy with no fetch, and one that changes it fetches the chapter once and replaces the old copy.
class FakeCache {
  entries = new Map<string, string>();
  match = async (request: Request) => {
    const body = this.entries.get(request.url);
    return body === undefined ? undefined : new Response(body);
  };
  put = async (request: Request, response: Response) => void this.entries.set(request.url, await response.text());
  keys = async () => [...this.entries.keys()].map((url) => new Request(url));
  delete = async (request: Request) => this.entries.delete(request.url);
}

function setup(served: Record<string, string> = {}) {
  const cache = new FakeCache();
  const caches = { open: async () => cache as unknown as Cache };
  const fetched: string[] = [];
  let offline = false;
  const fetcher = (async (input: Request) => {
    fetched.push(input.url);
    if (offline) throw new TypeError('Failed to fetch');
    const path = new URL(input.url).pathname;
    return path in served ? new Response(served[path]) : new Response('not found', { status: 404 });
  }) as typeof fetch;
  const ask = (path: string) => serveChapter(new Request(`http://localhost${path}`), caches, fetcher);
  return { cache, fetched, ask, goOffline: () => (offline = true), served };
}

const A = '/data/jhn/1.json?v=aaaaaaaaaaaa';
const B = '/data/jhn/1.json?v=bbbbbbbbbbbb';

describe('isVersionedChapter', () => {
  it('is a chapter address with a 12-hex ?v=, and nothing else', () => {
    const is = (path: string) => isVersionedChapter(new URL(path, 'http://localhost'));
    expect(is(A)).toBe(true);
    expect(is('/data/1co/13.json?v=0123456789ab')).toBe(true);
    expect(is('/data/jhn/1.json')).toBe(false);
    expect(is('/data/jhn/1.json?v=xyz')).toBe(false);
    expect(is('/data/index.json?v=aaaaaaaaaaaa')).toBe(false);
    expect(is('/data/ladder/el.json?v=aaaaaaaaaaaa')).toBe(false);
  });
});

describe('serveChapter', () => {
  it('fetches a chapter the phone does not hold once, keeps it, and serves it from the phone the next time with no fetch', async () => {
    const t = setup({ '/data/jhn/1.json': 'v1 text' });
    expect(await (await t.ask(A)).text()).toBe('v1 text');
    expect(t.fetched).toHaveLength(1);
    expect([...t.cache.entries.keys()]).toEqual([`http://localhost${A}`]);
    expect(await (await t.ask(A)).text()).toBe('v1 text');
    expect(t.fetched).toHaveLength(1);
  });

  it('serves a chapter whose fingerprint is unchanged after an update from the phone, with no fetch', async () => {
    const t = setup();
    t.cache.entries.set(`http://localhost${A}`, 'kept text');
    expect(await (await t.ask(A)).text()).toBe('kept text');
    expect(t.fetched).toEqual([]);
  });

  it('fetches a chapter whose fingerprint changed once and removes the old copy', async () => {
    const t = setup({ '/data/jhn/1.json': 'v2 text' });
    t.cache.entries.set(`http://localhost${A}`, 'v1 text');
    t.cache.entries.set('http://localhost/data/jhn/2.json?v=cccccccccccc', 'another chapter');
    expect(await (await t.ask(B)).text()).toBe('v2 text');
    expect(t.fetched).toEqual([`http://localhost${B}`]);
    expect([...t.cache.entries.keys()].sort()).toEqual([`http://localhost${B}`, 'http://localhost/data/jhn/2.json?v=cccccccccccc']);
    await t.ask(B);
    expect(t.fetched).toHaveLength(1);
  });

  it('keeps the old copy when the new one cannot be fetched, and reads from it offline', async () => {
    const t = setup();
    t.cache.entries.set(`http://localhost${A}`, 'v1 text');
    t.goOffline();
    expect(await (await t.ask(B)).text()).toBe('v1 text');
    expect([...t.cache.entries.keys()]).toEqual([`http://localhost${A}`]);
    const none = setup();
    none.goOffline();
    await expect(none.ask(B)).rejects.toThrow();
  });

  it('keeps nothing and removes nothing when the server refuses the chapter', async () => {
    const t = setup();
    t.cache.entries.set(`http://localhost${A}`, 'v1 text');
    expect((await t.ask(B)).status).toBe(404);
    expect([...t.cache.entries.keys()]).toEqual([`http://localhost${A}`]);
  });
});
