import { describe, expect, it } from 'vitest';
import { DATA_CACHE, dropOldDataCaches } from '../../src/dataCache';

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
