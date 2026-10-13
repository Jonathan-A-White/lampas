// The service worker's cache of the chapter data (/data/<book>/<n>.json). CacheFirst never asks again, so a deploy that changes the
// data's shape (mw-5r3p30.102 made EnglishChunk.s a list) must change this name: the old cache is dropped on activate and the
// chapters are fetched afresh. Raise DATA_CACHE_VERSION in that deploy.
// A change to ONE chapter's data does not raise it (mw-5r3p30.276): each chapter is kept under /data/<book>/<n>.json?v=<fingerprint>, the
// fingerprint from index.json, so only a chapter whose fingerprint changed is fetched again (serveChapter). Version 3 is that key layout;
// the unkeyed copies of version 2 cannot be told from stale ones and are dropped once.
export const DATA_CACHE_VERSION = 3;
export const DATA_CACHE = `lampas-data-v${DATA_CACHE_VERSION}`;

/** Deletes every chapter-data cache but the current one (the unversioned 'lampas-data' of the first builds, older versions). */
export async function dropOldDataCaches(caches: Pick<CacheStorage, 'keys' | 'delete'>): Promise<string[]> {
  const old = (await caches.keys()).filter((name) => name.startsWith('lampas-data') && name !== DATA_CACHE);
  await Promise.all(old.map((name) => caches.delete(name)));
  return old;
}

/** A chapter address with the fingerprint the app asks for it by: /data/jhn/1.json?v=0123456789ab (src/data/chapter.ts chapterUrl). */
export const isVersionedChapter = (url: URL): boolean =>
  /^\/data\/[0-9a-z]+\/\d+\.json$/.test(url.pathname) && /^[0-9a-f]{12}$/.test(url.searchParams.get('v') ?? '');

/**
 * Answers a versioned chapter request. A copy kept under the very address is served with no fetch. Otherwise the chapter is fetched once, kept,
 * and every other copy of the same chapter (an older fingerprint) is removed. A refusal is passed on and nothing is kept or removed; with no
 * network the older copy of the chapter is read in the new one's place, rather than nothing.
 */
export async function serveChapter(request: Request, caches: Pick<CacheStorage, 'open'>, fetcher: typeof fetch = fetch): Promise<Response> {
  const cache = await caches.open(DATA_CACHE);
  const kept = await cache.match(request);
  if (kept) return kept;
  const path = new URL(request.url).pathname;
  const others = async () => (await cache.keys()).filter((key) => new URL(key.url).pathname === path && key.url !== request.url);
  let response: Response;
  try {
    response = await fetcher(request);
  } catch (error) {
    const [older] = await others();
    const stale = older ? await cache.match(older) : undefined;
    if (stale) return stale;
    throw error;
  }
  if (!response.ok) return response;
  await cache.put(request, response.clone());
  await Promise.all((await others()).map((key) => cache.delete(key)));
  return response;
}
