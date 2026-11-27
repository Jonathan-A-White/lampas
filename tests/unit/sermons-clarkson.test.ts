// The clarkson-works sermon source (mw-qtu3zvz.280.16, docs/sermons.md): David Clarkson's sermons from the Nichol edition of The Practical Works (1864-65), as the Internet Archive scans it.
// A row's url is the Archive's reader page at the leaf where the sermon begins; the source has its On | Off switch, On to start.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { enabledSources } from '../../src/sermons/enabled';
import { videoOfRow } from '../../src/sermons/player';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';

const ID = 'clarkson-works';
const DYING = 'https://archive.org/details/practicalworksof01clar/page/n267';

beforeEach(() => {
  forgetSermonFiles();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input).replace(/\?v=[0-9a-f]{12}$/, '');
      try {
        return new Response(readFileSync(`public${path}`, 'utf8'), { status: 200 });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const source = () => bundledSources().find((s) => s.id === ID)!;

describe('the clarkson-works source', () => {
  it('is in the index with its licence, its credit and the Archive item it links back to', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry).toMatchObject({ kind: 'sermons', homepage: 'https://archive.org/details/practicalworksof01clar', rows: 34 });
    expect(entry?.onByDefault).not.toBe(false); // On to start: only a source that says on_by_default = false carries it
    expect(entry?.name).toMatch(/Clarkson/);
    expect(entry?.credit).toMatch(/David Clarkson/);
    expect(entry?.credit).toMatch(/Internet Archive/);
    expect(entry?.licence).toMatch(/Archive/);
    expect(entry?.books).toEqual(expect.arrayContaining(['heb', 'eph', 'rom']));
  });

  it('has no 2 Peter file: Clarkson preached no sermon on any verse of 2 Peter, and the index lists a sermon only by its preaching text', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry?.books).not.toContain('2pe');
  });

  it('has the Hebrews 11:13 row in heb.json, linking to the Archive page of the scan, never text', () => {
    const file = JSON.parse(readFileSync(`public/sermons/${ID}/heb.json`, 'utf8')) as SermonBookFile;
    const row = file.rows.find((r) => r.url === DYING);
    expect(row).toMatchObject({ title: 'Of Dying in Faith', preacher: 'David Clarkson', ref: { book: 'heb', chapter: 11, from: 13, to: 13 } });
    expect(row?.alt).toBeUndefined();
  });

  it('gives the sheet two rows for Hebrews 11:13 and two for Ephesians 5:2, each opening on the web with no video', async () => {
    const heb = (await source().sermonsFor({ book: 'heb', chapter: 11 })).filter((r) => r.ref.from === 13);
    expect(heb.map((r) => r.title)).toEqual(['Of Dying in Faith', 'Of Living as Strangers']);
    expect(heb[0]).toMatchObject({ source: ID, opensIn: 'web' });
    expect(heb[0].open.url).toBe(DYING);
    expect(videoOfRow(heb[0])).toBeUndefined();
    const eph = (await source().sermonsFor({ book: 'eph', chapter: 5 })).filter((r) => r.ref.from === 2);
    expect(eph.map((r) => r.title)).toEqual(['The Love of Christ', "Christ's Sacrifice"]);
  });

  it('has a switch, On | Off, On to start, and Off drops its rows from the Sermons sheet', async () => {
    const cw = source();
    expect(cw.default).toBe('on');
    const setting = sermonSourceSetting(cw);
    expect(setting.key).toBe(`sermons.${ID}`);
    expect(setting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'on' }, { value: 'off' }] });
    const read = (value?: string) => (key: string) => (key === `sermons.${ID}` ? value : undefined);
    expect(enabledSources([cw], read()).map((s) => s.id)).toEqual([ID]);
    expect(enabledSources([cw], read('off')).map((s) => s.id)).toEqual([]);
    const on = enabledSources([cw], read('on'));
    expect((await on[0].sermonsFor({ book: 'heb', chapter: 11 })).length).toBeGreaterThan(0);
  });
});
