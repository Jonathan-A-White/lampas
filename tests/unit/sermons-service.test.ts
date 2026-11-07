// The sermon index service's client (mw-qtu3zvz.5, src/services/sermons.ts, docs/sermons.md 'When online'): the request each call makes, the 2 second wait, and that it is free: no licence, no device key, never the mill.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SERMONS_URL } from '../../src/config';
import { fetchSermons, fetchSources, fetchThemes, fetchThemeSermons, search, SERVICE_WAIT_MS, setSermonsUrl, sermonsServiceKnown } from '../../src/services/sermons';
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
