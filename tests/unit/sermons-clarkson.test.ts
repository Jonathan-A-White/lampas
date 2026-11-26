// The clarkson-works sermon source (mw-qtu3zvz.280.16, docs/sermons.md): David Clarkson's 34 sermons from the Nichol edition (Edinburgh 1864-65), bundled as links to the Internet Archive's scan of the page.
// A row's url is the page of the scanned book, opened on archive.org (Lampas reads none of it aloud); the source has its On | Off switch, On to start.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { enabledSources } from '../../src/sermons/enabled';
import { videoOfRow } from '../../src/sermons/player';
import { readsHere } from '../../src/sermons/sermonText';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';

const ID = 'clarkson-works';
const DYING = 'https://archive.org/details/practicalworksof01clar/page/n267';
const STRANGERS = 'https://archive.org/details/practicalworksof01clar/page/n272';

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
  it('is in the index with its licence, its credit, the page it links back to and a start On', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry).toMatchObject({ kind: 'sermons', homepage: 'https://archive.org/details/practicalworksof01clar', rows: 34 });
    expect(entry?.onByDefault).toBeUndefined(); // its source.toml says on_by_default = true
    expect(entry?.name).toBe('David Clarkson\'s sermons (Internet Archive scans)');
    expect(entry?.credit).toMatch(/David Clarkson; Internet Archive .*Nichol edition/);
    expect(entry?.licence).toContain('The Internet Archive does not assert any new copyright');
    let rows = 0;
    for (const book of entry?.books ?? []) rows += (JSON.parse(readFileSync(`public/sermons/${ID}/${book}.json`, 'utf8')) as SermonBookFile).rows.length;
    expect(rows).toBe(34);
  });

  it('has the two Hebrews 11:13 sermons in heb.json, each with the Archive\'s page of the scanned book', () => {
    const file = JSON.parse(readFileSync(`public/sermons/${ID}/heb.json`, 'utf8')) as SermonBookFile;
    const at = file.rows.filter((r) => r.ref.chapter === 11 && r.ref.from === 13);
    expect(at.map((r) => [r.title, r.url])).toEqual([['Of Dying in Faith', DYING], ['Of Living as Strangers', STRANGERS]]);
    expect(at.every((r) => r.preacher === 'David Clarkson' && r.alt === undefined)).toBe(true);
  });

  it('gives the sheet the rows for Hebrews 11 and Ephesians 5, opened on the web, played by nothing and read aloud by no one', async () => {
    const rows = await source().sermonsFor({ book: 'heb', chapter: 11 });
    const row = rows.find((r) => r.open.url === DYING);
    expect(row).toMatchObject({ source: ID, title: 'Of Dying in Faith', opensIn: 'web', ref: { book: 'heb', chapter: 11, from: 13, to: 13 } });
    expect(videoOfRow(row!)).toBeUndefined();
    expect(readsHere({ ...row!, source: ID })).toBe(false);
    const eph = await source().sermonsFor({ book: 'eph', chapter: 5 });
    expect(eph.filter((r) => r.ref.from === 2).map((r) => r.title)).toEqual(['The Love of Christ', 'Christ\'s Sacrifice']);
  });

  it('has a switch, On | Off, On to start, and Off drops its rows from the Sermons sheet', async () => {
    const clarkson = source();
    expect(clarkson.default).toBe('on');
    const setting = sermonSourceSetting(clarkson);
    expect(setting.key).toBe(`sermons.${ID}`);
    expect(setting.label).toBe('David Clarkson\'s sermons');
    expect(setting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }] });
    const read = (value?: string) => (key: string) => (key === `sermons.${ID}` ? value : undefined);
    expect(enabledSources([clarkson], read('off'))).toEqual([]);
    expect(enabledSources([clarkson], read()).map((s) => s.id)).toEqual([ID]);
    const on = enabledSources([clarkson], read('on'));
    expect((await on[0].sermonsFor({ book: 'heb', chapter: 11 })).map((r) => r.open.url)).toContain(DYING);
  });
});
