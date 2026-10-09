// The service worker's cache of the chapter data (/data/<book>/<n>.json). CacheFirst never asks again, so a deploy that changes the
// data's shape (mw-5r3p30.102 made EnglishChunk.s a list) must change this name: the old cache is dropped on activate and the
// chapters are fetched afresh. Raise DATA_CACHE_VERSION in that deploy.
export const DATA_CACHE_VERSION = 2;
export const DATA_CACHE = `lampas-data-v${DATA_CACHE_VERSION}`;

/** Deletes every chapter-data cache but the current one (the unversioned 'lampas-data' of the first builds, older versions). */
export async function dropOldDataCaches(caches: Pick<CacheStorage, 'keys' | 'delete'>): Promise<string[]> {
  const old = (await caches.keys()).filter((name) => name.startsWith('lampas-data') && name !== DATA_CACHE);
  await Promise.all(old.map((name) => caches.delete(name)));
  return old;
}
