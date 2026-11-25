// The biblethinker sermon source (mw-qtu3zvz.280.4, docs/sermons.md): Mike Winger's book-by-book series on Bible Thinker, bundled as links with the YouTube video each post embeds.
// A row's url is the post it links back to; its alt is the YouTube address Lampas plays; the source has its On | Off switch, Off to start.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { enabledSources } from '../../src/sermons/enabled';
import { videoOfRow } from '../../src/sermons/player';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { videoOf } from '../../src/sermons/video';
import { pageLabel, pageOfRow } from '../../src/sermons/playerPage';
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

  it('counts the teachings outside the four book series too, on books beyond 1 Peter, Hebrews, Mark and Romans (mw-qtu3zvz.280.10)', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry?.rows).toBe(177);
    expect(entry?.books).toEqual(expect.arrayContaining(['mat', 'gen', 'isa', 'jhn', 'php']));
    let rows = 0;
    for (const book of entry?.books ?? []) rows += (JSON.parse(readFileSync(`public/sermons/${ID}/${book}.json`, 'utf8')) as SermonBookFile).rows.length;
    expect(rows).toBeGreaterThanOrEqual(entry?.rows ?? Infinity); // a row over two books is in both files
  });

  describe('Matthew 6:33, a teaching of no book series (mw-qtu3zvz.280.10)', () => {
    const POST_33 = 'https://biblethinker.org/what-christians-need-to-prioritize-matthew-633/';
    const VIDEO_33 = 'EZ4_ZrlYs5Y';

    it('shows a Bible Thinker row in the Sermons sheet for Matthew 6, with its link back and the video it plays', async () => {
      const rows = await source().sermonsFor({ book: 'mat', chapter: 6 });
      const row = rows.find((r) => r.open.url === POST_33);
      expect(row).toMatchObject({ source: ID, title: 'What Christians Need to Prioritize: Matthew 6:33', opensIn: 'web', ref: { book: 'mat', chapter: 6, from: 33, to: 33 } });
      const video = videoOfRow(row!);
      expect(video).toEqual({ kind: 'youtube', id: VIDEO_33 });
      expect(pageOfRow(row!, video)).toBe(POST_33);
      expect(pageLabel(POST_33)).toBe('Open on biblethinker.org ›');
    });

    it('is in no book series: Matthew has no series, and no other source row of this one names Matthew but the teachings', async () => {
      const file = JSON.parse(readFileSync(`public/sermons/${ID}/mat.json`, 'utf8')) as SermonBookFile;
      expect(file.rows.map((r) => r.url)).toContain(POST_33);
      expect(file.rows.every((r) => r.preacher === 'Mike Winger')).toBe(true);
    });

    it('goes with the switch: Off drops it from the sheet, On gives it', async () => {
      const bt = source();
      const read = (value?: string) => (key: string) => (key === `sermons.${ID}` ? value : undefined);
      expect(enabledSources([bt], read('off'))).toEqual([]);
      const on = enabledSources([bt], read('on'));
      expect((await on[0].sermonsFor({ book: 'mat', chapter: 6 })).map((r) => r.open.url)).toContain(POST_33);
    });
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
