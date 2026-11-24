// The biblethinker sermon source (mw-qtu3zvz.280.4, docs/sermons.md): Mike Winger's book-by-book series on Bible Thinker, bundled as links with the YouTube video each post embeds.
// A row's url is the post it links back to; its alt is the YouTube address Lampas plays; the source has its On | Off switch, Off to start.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { enabledSources } from '../../src/sermons/enabled';
import { videoOfRow } from '../../src/sermons/player';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { videoOf } from '../../src/sermons/video';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';

const ID = 'biblethinker';
const POST = 'https://biblethinker.org/hope-in-grief-born-again-jesus-resurrection-1-peter-13-7/';
const VIDEO = 'n-0M1f1iJ5Y';

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

describe('the biblethinker source', () => {
  it('is in the index with its credit, the page it links back to and a start Off', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry).toMatchObject({ kind: 'sermons', onByDefault: false, homepage: 'https://biblethinker.org/mark/' });
    expect(entry?.name).toMatch(/Bible Thinker/);
    expect(entry?.credit).toMatch(/Mike Winger/);
    expect(entry?.books).toEqual(expect.arrayContaining(['1pe', 'mrk', 'rom']));
    expect(entry?.rows).toBeGreaterThan(100);
  });

  it('has the 1 Peter 1:3-7 row in 1pe.json, linking back to its post and holding the video the post embeds', () => {
    const file = JSON.parse(readFileSync(`public/sermons/${ID}/1pe.json`, 'utf8')) as SermonBookFile;
    const row = file.rows.find((r) => r.url === POST);
    expect(row).toMatchObject({ title: 'Hope in Grief, Born Again, Jesus’ Resurrection: 1 Peter 1:3-7', preacher: 'Mike Winger', ref: { book: '1pe', chapter: 1, from: 3, to: 7 } });
    expect(row?.alt).toBe(`https://www.youtube.com/watch?v=${VIDEO}`);
    expect(videoOf(row!.alt!)).toEqual({ kind: 'youtube', id: VIDEO });
  });

  it('gives the sheet the row for 1 Peter 1:5, which plays the video here and keeps the post as its link', async () => {
    const rows = await source().sermonsFor({ book: '1pe', chapter: 1 });
    const row = rows.find((r) => r.open.url === POST);
    expect(row).toMatchObject({ source: ID, opensIn: 'web' });
    expect(videoOfRow(row!)).toEqual({ kind: 'youtube', id: VIDEO });
  });

  it('has a switch, On | Off, Off to start, and Off drops its rows from the Sermons sheet', async () => {
    const bt = source();
    expect(bt.default).toBe('off');
    const setting = sermonSourceSetting(bt);
    expect(setting.key).toBe(`sermons.${ID}`);
    expect(setting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'on' }, { value: 'off' }] });
    const read = (value?: string) => (key: string) => (key === `sermons.${ID}` ? value : undefined);
    expect(enabledSources([bt], read()).map((s) => s.id)).toEqual([]);
    expect(enabledSources([bt], read('off')).map((s) => s.id)).toEqual([]);
    const on = enabledSources([bt], read('on'));
    expect(on.map((s) => s.id)).toEqual([ID]);
    expect((await on[0].sermonsFor({ book: '1pe', chapter: 1 })).length).toBeGreaterThan(0);
  });
});
