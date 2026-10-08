// The worker answers /data/ requests cache-first, so a chapter once read stays offline; only index.json
// and rom/8.json are in the precache (pwa-precache.ts), every other chapter comes through this route.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';

const registered: Array<{ match: (ctx: { url: URL; request: Request }) => boolean; handler: unknown }> = [];
class CacheFirst {
  options: { cacheName?: string };
  constructor(options: { cacheName?: string }) {
    this.options = options;
  }
}

vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }));
vi.mock('workbox-routing', () => ({
  NavigationRoute: class {},
  registerRoute: (match: (ctx: { url: URL; request: Request }) => boolean, handler: unknown) => registered.push({ match, handler }),
}));
vi.mock('workbox-strategies', () => ({ CacheFirst }));

beforeAll(async () => {
  Object.assign(window, { skipWaiting: vi.fn(), clients: { claim: vi.fn() }, __WB_MANIFEST: [] });
  Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [], open: vi.fn() } });
  await import('../../src/sw');
});

const ctx = (path: string, method = 'GET') => ({ url: new URL(path, 'http://localhost'), request: new Request(`http://localhost${path}`, { method }) });

describe('the /data/ runtime route', () => {
  it('matches a chapter and the index, and nothing else', () => {
    const route = registered.find((r) => r.handler instanceof CacheFirst);
    expect(route).toBeDefined();
    expect(route?.match(ctx('/data/jhn/1.json'))).toBe(true);
    expect(route?.match(ctx('/data/1co/13.json'))).toBe(true);
    expect(route?.match(ctx('/data/index.json'))).toBe(true);
    expect(route?.match(ctx('/assets/index-abc.js'))).toBe(false);
    expect(route?.match(ctx('/'))).toBe(false);
    expect(route?.match(ctx('/data/jhn/1.json', 'POST'))).toBe(false);
  });
});

describe('the precache', () => {
  it('lists data/index.json and data/rom/8.json, and no glob that would take another chapter', () => {
    expect(injectManifestOptions.globPatterns).toContain('data/index.json');
    expect(injectManifestOptions.globPatterns).toContain('data/lexicon.json');
    expect(injectManifestOptions.globPatterns).toContain('data/rom/8.json');
    for (const pattern of injectManifestOptions.globPatterns) {
      if (pattern.includes('data')) expect(pattern).not.toContain('*');
      else expect(pattern).not.toMatch(/json/);
    }
  });
});
