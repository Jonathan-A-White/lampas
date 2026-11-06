// src/sermons/sources/bundled.ts (mw-qtu3zvz.2): one source per source of public/sermons/index.json, reading <book>.json on first use, once, by the versioned address the worker keeps.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX } from '../../src/data/sermonIndex';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';

const asked: string[] = [];
beforeEach(() => {
  asked.length = 0;
  forgetSermonFiles();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      asked.push(url);
      const path = url.replace(/\?v=[0-9a-f]{12}$/, '');
      try {
        return new Response(readFileSync(`public${path}`, 'utf8'), { status: 200 });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const [spurgeon, henry] = bundledSources();

describe('the bundled sources', () => {
  it('are one per source of the index, with its name, home page and credit', () => {
    expect(bundledSources().map((s) => s.id)).toEqual(SERMON_INDEX.sources.map((s) => s.id));
    expect(spurgeon).toMatchObject({ id: 'spurgeon-ccel', name: "Spurgeon's sermons (CCEL)", homepage: 'https://ccel.org/ccel/spurgeon', default: 'on' });
    expect(spurgeon.credit).toBe('Christian Classics Ethereal Library, Calvin University');
    expect(spurgeon.describe.length).toBeGreaterThan(10);
    expect(spurgeon.needs).toBeUndefined();
  });

  it('read a book’s file once, by its fingerprinted address, and give the rows that touch the chapter as module rows', async () => {
    const rows = await spurgeon.sermonsFor({ book: 'rom', chapter: 5, from: 8, to: 8 });
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatch(/^\/sermons\/spurgeon-ccel\/rom\.json\?v=[0-9a-f]{12}$/);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.ref.book === 'rom' && r.ref.chapter <= 5 && (r.ref.toChapter ?? r.ref.chapter) >= 5)).toBe(true);
    expect(rows[0]).toMatchObject({ source: 'spurgeon-ccel', role: 'text', opensIn: 'web', open: { url: expect.stringMatching(/^https:\/\/ccel\.org\//) } });
    await spurgeon.sermonsFor({ book: 'rom', chapter: 8 });
    expect(asked).toHaveLength(1);
  });

  it('ask for nothing of a book the source has no file for', async () => {
    expect(await henry.sermonsFor({ book: 'rom', chapter: 5 })).toEqual([]);
    expect(await spurgeon.sermonsFor({ book: 'xyz', chapter: 1 })).toEqual([]);
    expect(asked).toEqual([]);
  });

  it('answer a source’s row with no preacher or date as it is, and a failed file as an error that is asked for again', async () => {
    const failing = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', failing);
    await expect(spurgeon.sermonsFor({ book: 'rom', chapter: 5 })).rejects.toThrow();
    await expect(spurgeon.sermonsFor({ book: 'rom', chapter: 5 })).rejects.toThrow();
    expect(failing).toHaveBeenCalledTimes(2);
  });
});
