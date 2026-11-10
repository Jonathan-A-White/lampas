// The sermon index service's client (mw-qtu3zvz.5, src/services/sermons.ts, docs/sermons.md 'When online'): the request each call makes, the 2 second wait, and that it is free: no licence, no device key, never the mill.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SERMONS_URL } from '../../src/config';
import { db } from '../../src/data/db';
import { directThemeRows } from '../../src/sermons';
import { setKnownSermonSources } from '../../src/sermons/known';
import { fetchDirectThemeSermons, fetchSermons, fetchSources, fetchThemes, fetchThemeSermons, search, SERVICE_WAIT_MS, setSermonsUrl, sermonsServiceKnown } from '../../src/services/sermons';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../support/test-themes';
import direct from '../fixtures/sermons/api-direct-theme.json';
import rom58 from '../fixtures/sermons/api-rom-5-8.json';
import apiSources from '../fixtures/sermons/api-sources.json';

const BASE = 'https://sermons.test';
let asked: { url: string; init: RequestInit | undefined }[];

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  asked = [];
  setSermonsUrl(BASE);
});
afterEach(() => {
  setSermonsUrl(undefined);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const serve = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    asked.push({ url: String(input), init });
    return Promise.resolve(answer(body, status));
  });

describe('the address', () => {
  it('is empty in the tests (VITE_SERMONS_URL), so no test reaches the real service by chance', () => {
    expect(SERMONS_URL).toBe('');
    setSermonsUrl(undefined);
    expect(sermonsServiceKnown()).toBe(false);
  });

  it('is https://sermons.allmymind.org when the build sets none (.env.example names it)', () => {
    expect(readFileSync(join(__dirname, '../../src/config.ts'), 'utf8')).toContain("'https://sermons.allmymind.org'");
    expect(readFileSync(join(__dirname, '../../.env.example'), 'utf8')).toContain('VITE_SERMONS_URL=https://sermons.allmymind.org');
  });

  it('with none, a call fails without a request', async () => {
    setSermonsUrl('');
    serve({});
    await expect(fetchSermons('rom.5.8')).rejects.toThrow(/no sermon index service/);
    expect(asked).toEqual([]);
  });
});

describe('the requests', () => {
  it('fetchSermons GETs /v1/sermons with the ref and the sources that are On', async () => {
    serve(rom58['GET /v1/sermons?ref=rom.5.8']);
    const got = await fetchSermons('rom.5.8', ['spurgeon-ccel', 'henry-sermons']);
    expect(asked.map((a) => a.url)).toEqual([`${BASE}/v1/sermons?ref=rom.5.8&source=spurgeon-ccel,henry-sermons`]);
    expect(got.total).toBe(1);
    expect(got.rows[0]).toMatchObject({ source: 'spurgeon-20', id: '104', title: "Love's Commendation", role: 'text', ref: 'Rom.5.8' });
  });

  it('fetchSermons takes the page size (the sheet asks for 200) and leaves source out when none are named', async () => {
    serve(rom58['GET /v1/sermons?ref=rom.5.8']);
    await fetchSermons('rom.5', undefined, 200);
    expect(asked[0].url).toBe(`${BASE}/v1/sermons?ref=rom.5&limit=200`);
  });

  it('fetchSources GETs /v1/sources and gives the rows', async () => {
    serve(apiSources['GET /v1/sources']);
    const rows = await fetchSources();
    expect(asked[0].url).toBe(`${BASE}/v1/sources`);
    expect(rows.map((r) => [r.id, r.kind, r.on_by_default])).toEqual([
      ['spurgeon-20', 'sermons', false],
      ['themes-demo', 'themes', false],
    ]);
  });

  it('fetchThemes GETs /v1/themes with the ref', async () => {
    serve(rom58['GET /v1/themes?ref=rom.5.8']);
    const rows = await fetchThemes('rom.5.8');
    expect(asked[0].url).toBe(`${BASE}/v1/themes?ref=rom.5.8`);
    expect(rows.map((r) => r.label)).toEqual(['Love', 'Atonement']);
  });

  it('search GETs /v1/search with the words, encoded, and gives the hits', async () => {
    serve(rom58['GET /v1/search?q=spurgeon+grace']);
    const hits = await search('  spurgeon grace ');
    expect(asked[0].url).toBe(`${BASE}/v1/search?q=spurgeon%20grace`);
    expect(hits.map((h) => h.id)).toEqual(['37', '126', '330', '385']);
  });

  it('search asks nothing for an empty query or one over 200 characters', async () => {
    serve({ rows: [] });
    expect(await search('   ')).toEqual([]);
    expect(await search('x'.repeat(201))).toEqual([]);
    expect(asked).toEqual([]);
  });

  it('fetchThemeSermons asks the theme tier over the whole Bible for one topic and gives its sermons', async () => {
    serve(rom58['GET /v1/sermons?ref=rom.5.8&tier=theme-only&theme=themes-demo:atonement']);
    const got = await fetchThemeSermons('themes-demo', 'atonement');
    expect(asked[0].url).toBe(`${BASE}/v1/sermons?ref=Gen.1.1-Rev.22.21&tier=theme-only&theme=themes-demo:atonement&limit=50`);
    expect(got.rows.map((r) => r.id)).toEqual(['1191']);
  });

  it('a request carries no cookie, no key and no header of ours', async () => {
    serve({ rows: [] });
    await search('grace');
    expect(asked[0].init?.credentials).toBe('omit');
    expect(asked[0].init?.headers).toBeUndefined();
    expect(asked[0].init?.method).toBeUndefined();
  });

  it('an answer that is not ok is an error (the service says bad_ref with a 400)', async () => {
    serve(rom58['GET /v1/sermons?ref=Rom.5.99'], 400);
    await expect(fetchSermons('Rom.5.99')).rejects.toThrow(/answered 400/);
  });
});

describe('the wait', () => {
  it('a call that is not answered in 2 seconds is given up', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      (_: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const failed = fetchSermons('rom.5').then(
      () => 'answered',
      (error: unknown) => (error as Error).name,
    );
    await vi.advanceTimersByTimeAsync(SERVICE_WAIT_MS - 1);
    let settled = false;
    void failed.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await failed).toBe('AbortError');
    expect(SERVICE_WAIT_MS).toBe(2000);
  });
});

describe('it is free', () => {
  /** The files `file` imports by a relative path, and the packages it names. */
  const importsOf = (file: string): { files: string[]; packages: string[] } => {
    const text = readFileSync(file, 'utf8');
    const names = [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    return { files: names.filter((n) => n.startsWith('.')), packages: names.filter((n) => !n.startsWith('.')) };
  };

  it('imports nothing of the mill, the licence, the device key or bsv-kit/grist, however far its imports reach', () => {
    const root = join(__dirname, '../../src');
    const seen = new Set<string>();
    const packages = new Set<string>();
    const walk = (file: string): void => {
      if (seen.has(file)) return;
      seen.add(file);
      const found = importsOf(file);
      found.packages.forEach((p) => packages.add(p));
      for (const name of found.files) {
        const base = join(file, '..', name);
        for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
          try {
            readFileSync(candidate);
            walk(candidate);
            break;
          } catch {
            /* the next form */
          }
        }
      }
    };
    walk(join(root, 'services/sermons.ts'));
    const names = [...seen].map((f) => f.slice(root.length + 1));
    for (const forbidden of ['services/mill.ts', 'services/deviceKey.ts', 'services/licenceNow.ts', 'services/licenceCheck.ts', 'services/licenceCache.ts', 'services/tutor.ts']) expect(names).not.toContain(forbidden);
    expect(names.filter((n) => n.startsWith('gate/'))).toEqual([]);
    expect([...packages].filter((p) => /bsv-kit|@bsv/.test(p))).toEqual([]);
    // and the file itself says so in its imports
    expect(importsOf(join(root, 'services/sermons.ts')).packages).toEqual([]);
  });
});

// The call for the sermons the service marks as linked from their notes (mw-qtu3zvz.59.2, docs/sermons.md 'When online'): the theme tier for the verse or passage, over every source that is On.
describe('the theme-tier call for directly linked sermons', () => {
  const eph = direct['GET /v1/sermons?ref=eph.2.8&tier=theme-only'];

  it('fetchDirectThemeSermons GETs the theme tier for the place, the sources that are On, direct links only, and gives its rows', async () => {
    serve(eph);
    const got = await fetchDirectThemeSermons('eph.2.8', ['testsermons', 'spurgeon-20']);
    expect(asked.map((a) => a.url)).toEqual([`${BASE}/v1/sermons?ref=eph.2.8&tier=theme-only&source=testsermons,spurgeon-20&direct=only&limit=200`]);
    expect(got.map((r) => r.id)).toEqual(['12', '37', '330', '2544']);
    expect(got[0].direct).toBe(true);
    expect(got[1].direct).toBeUndefined();
  });

  it('carries no cookie, no key and no header, and gives up at 2 seconds', async () => {
    serve(eph);
    await fetchDirectThemeSermons('eph.2.8', ['a']);
    expect(asked[0].init?.credentials).toBe('omit');
    expect(asked[0].init?.headers).toBeUndefined();
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      (_: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const failed = fetchDirectThemeSermons('eph.2.8', ['a']).then(
      () => 'answered',
      (error: unknown) => (error as Error).name,
    );
    await vi.advanceTimersByTimeAsync(SERVICE_WAIT_MS);
    expect(await failed).toBe('AbortError');
  });

  describe('as the Sermons sheet makes it', () => {
    const own = { id: 'spurgeon-20', name: 'Spurgeon', credit: 'C. H. Spurgeon', homepage: 'https://ccel.org/ccel/spurgeon', onByDefault: true };
    beforeEach(async () => {
      await db.open();
      await db.settings.clear();
      await db.meta.clear();
      registerTestSermons();
      registerTestThemes();
      setKnownSermonSources([]);
      serve(eph);
    });
    afterEach(() => {
      forgetTestSermons();
      forgetTestThemes();
      setKnownSermonSources([]);
    });

    it('asks for the verse, or for the passage, never the chapter, with the ids of every source that is On: the bundled and the service\'s own', async () => {
      const { rememberSermonSources } = await import('../../src/data/repositories');
      await rememberSermonSources([own]);
      await directThemeRows({ book: 'rom', chapter: 5, from: 8 });
      await directThemeRows({ book: 'rom', chapter: 5, from: 6, to: 8 });
      expect(asked.map((a) => new URL(a.url).searchParams.get('ref'))).toEqual(['rom.5.8', 'rom.5.6-rom.5.8']);
      for (const a of asked) {
        const url = new URL(a.url);
        expect(url.pathname).toBe('/v1/sermons');
        expect(url.searchParams.get('tier')).toBe('theme-only');
        expect(url.searchParams.get('source')).toBe('testsermons,spurgeon-20');
        expect(a.init?.credentials).toBe('omit');
      }
    });

    it('asks nothing for a whole chapter, with no service address, with no source On, and for a verse no topic holds', async () => {
      await directThemeRows({ book: 'rom', chapter: 5 });
      setSermonsUrl('');
      expect(await directThemeRows({ book: 'rom', chapter: 5, from: 8 })).toEqual([]);
      setSermonsUrl(BASE);
      await db.settings.put({ key: 'sermons.testsermons', value: 'off' });
      expect(await directThemeRows({ book: 'rom', chapter: 5, from: 8 })).toEqual([]);
      await db.settings.put({ key: 'sermons.testsermons', value: 'on' });
      await directThemeRows({ book: 'rom', chapter: 5, from: 40 });
      expect(asked).toEqual([]);
    });
  });
});
