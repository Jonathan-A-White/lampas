// The allennolan sermon source (mw-qtu3zvz.280.19, docs/sermons.md): Pastor Allen Nolan's book-by-book preaching, read from his YouTube channel @allennolan through YouTube's Data API (sermon-index sources/allennolan).
// A row's url is the video's watch address, which the player plays; the source has its On | Off switch, Off to start (its source.toml says on_by_default = false).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { enabledSources } from '../../src/sermons/enabled';
import { videoOfRow } from '../../src/sermons/player';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { videoOf } from '../../src/sermons/video';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';

const ID = 'allennolan';

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

describe('the allennolan source', () => {
  it('is in the index Off to start, with the channel it links back to and the YouTube terms it was read under', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry).toMatchObject({ kind: 'sermons', name: 'Allen Nolan', homepage: 'https://www.youtube.com/@allennolan', rows: 116, onByDefault: false });
    expect(entry?.credit).toMatch(/Allen Nolan/);
    expect(entry?.licence).toMatch(/API Clients/);
    expect(entry?.books).toEqual(expect.arrayContaining(['rev', 'isa', 'amo', '1co']));
  });

  it('has every row playing a YouTube video: the url is a watch address of the channel\'s videos, and videoOf() reads its id', () => {
    for (const book of ['amo', 'rev', 'isa', '1co']) {
      const file = JSON.parse(readFileSync(`public/sermons/${ID}/${book}.json`, 'utf8')) as SermonBookFile;
      expect(file.rows.length).toBeGreaterThan(0);
      for (const row of file.rows) {
        expect(row.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
        expect(videoOf(row.url)).toEqual({ kind: 'youtube', id: row.url.slice(-11) });
        expect(row.preacher).toBe('Allen Nolan');
      }
    }
  });

  it('gives the sheet the Amos 1:11-12 video, played in Lampas\'s own player', async () => {
    const rows = (await source().sermonsFor({ book: 'amo', chapter: 1 })).filter((r) => r.ref.from === 11);
    expect(rows.map((r) => r.title)).toEqual([expect.stringContaining('4 Sins of EDOM')]);
    expect(rows[0]).toMatchObject({ source: ID, opensIn: 'web', open: { url: 'https://www.youtube.com/watch?v=UitRgN_bX3c' } });
    expect(videoOfRow(rows[0])).toEqual({ kind: 'youtube', id: 'UitRgN_bX3c' });
  });

  it('has a switch, On | Off, Off to start, and Off drops its rows from the Sermons sheet', async () => {
    const an = source();
    expect(an.default).toBe('off');
    const setting = sermonSourceSetting(an);
    expect(setting.key).toBe(`sermons.${ID}`);
    expect(setting.label).toBe('Allen Nolan');
    expect(setting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'on' }, { value: 'off' }] });
    const read = (value?: string) => (key: string) => (key === `sermons.${ID}` ? value : undefined);
    expect(enabledSources([an], read()).map((s) => s.id)).toEqual([]);
    expect(enabledSources([an], read('off')).map((s) => s.id)).toEqual([]);
    const on = enabledSources([an], read('on'));
    expect(on.map((s) => s.id)).toEqual([ID]);
    expect((await on[0].sermonsFor({ book: 'amo', chapter: 1 })).length).toBeGreaterThan(0);
  });
});
