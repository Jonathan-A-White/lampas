// A reading ladder is fetched by its fingerprint (mw-9ji6ek0.10): /data/ladder/<lang>.json?v=<fingerprint>, the fingerprint from public/data/index.json as a
// chapter's is, so a rescored list reaches a phone that kept the old one. scripts/ladder-shared.ts writes the fingerprints; the worker keeps a list under its address.
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CANON_INDEX } from '../../src/data/bookIndex';
import { ladderUrl } from '../../src/data/chapter';
import { forgetLadders, LADDER_LANGS, loadLadder } from '../../src/data/readingLadder';
import { isVersionedLadder, serveChapter } from '../../src/dataCache';
import { buildLadder } from '../../scripts/ladder-el';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLadders();
});

const fingerprintOf = (file: string): string => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);

describe('the ladder fingerprints in index.json', () => {
  it('has one for each list, and it is the fingerprint of the list committed', () => {
    for (const lang of LADDER_LANGS) {
      expect(CANON_INDEX.ladders?.[lang], lang).toMatch(/^[0-9a-f]{12}$/);
      expect(CANON_INDEX.ladders?.[lang], lang).toBe(fingerprintOf(`public/data/ladder/${lang}.json`));
    }
  });

  it('are written by the script that writes the list, so a rescored list changes its own and no other', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ladder-fp-'));
    cpSync('public/data/jhn', join(dir, 'jhn'), { recursive: true });
    const jhn = CANON_INDEX.books.filter((b) => b.code === 'jhn');
    writeFileSync(join(dir, 'index.json'), JSON.stringify({ books: jhn, ladders: { en: 'aaaaaaaaaaaa', he: 'bbbbbbbbbbbb' } }));
    buildLadder(dir, join(dir, 'ladder', 'el.json'));
    const after = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { ladders: Record<string, string> };
    expect(after.ladders.el).toBe(fingerprintOf(join(dir, 'ladder', 'el.json')));
    expect(after.ladders.en).toBe('aaaaaaaaaaaa');
    expect(after.ladders.he).toBe('bbbbbbbbbbbb');
  });
});

describe('loadLadder', () => {
  it('asks for the list by its fingerprint from the index', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      asked.push(String(input));
      return new Response('[]', { status: 200 });
    });
    for (const lang of LADDER_LANGS) await loadLadder(lang);
    expect(asked).toEqual(LADDER_LANGS.map((lang) => `/data/ladder/${lang}.json?v=${CANON_INDEX.ladders?.[lang]}`));
    expect(ladderUrl('el')).toBe(`/data/ladder/el.json?v=${CANON_INDEX.ladders?.el}`);
  });
});

describe('the worker keeps a list under its fingerprint', () => {
  it('takes a list asked for by its fingerprint, and not a plain address', () => {
    const is = (path: string) => isVersionedLadder(new URL(path, 'http://localhost'));
    expect(is('/data/ladder/el.json?v=0123456789ab')).toBe(true);
    expect(is('/data/ladder/he.json?v=0123456789ab')).toBe(true);
    expect(is('/data/ladder/el.json')).toBe(false);
    expect(is('/data/ladder/el.json?v=xyz')).toBe(false);
    expect(is('/data/jhn/1.json?v=0123456789ab')).toBe(false);
  });

  it('fetches a rescored list once and drops the old copy', async () => {
    const entries = new Map<string, string>();
    const cache = {
      match: async (request: Request) => (entries.has(request.url) ? new Response(entries.get(request.url)) : undefined),
      keys: async () => [...entries.keys()].map((url) => new Request(url)),
      put: async (request: Request, response: Response) => void entries.set(request.url, await response.text()),
      delete: async (request: Request) => entries.delete(request.url),
    };
    const caches = { open: async () => cache } as unknown as CacheStorage;
    const old = new Request('http://localhost/data/ladder/el.json?v=aaaaaaaaaaaa');
    entries.set(old.url, 'old scores');
    const fresh = new Request('http://localhost/data/ladder/el.json?v=bbbbbbbbbbbb');
    const fetcher = vi.fn(async () => new Response('new scores'));
    expect(await (await serveChapter(fresh, caches, fetcher as unknown as typeof fetch)).text()).toBe('new scores');
    expect([...entries.keys()]).toEqual([fresh.url]);
  });
});
