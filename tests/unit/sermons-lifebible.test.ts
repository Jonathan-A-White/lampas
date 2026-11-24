// The lifebible-ttb sermon source (mw-qtu3zvz.280.3, docs/sermons.md): Pastor Paul LeBoutillier's Through the Bible, bundled as links with the YouTube video each page embeds.
// A row's url is the page it links back to; its alt is the YouTube address Lampas plays; the source has its On | Off switch, Off to start.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { enabledSources } from '../../src/sermons/enabled';
import { videoOfRow } from '../../src/sermons/player';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { videoOf } from '../../src/sermons/video';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';

const ID = 'lifebible-ttb';
const PAGE = 'https://www.lifebibleministry.com/through-the-bible/isaiah/1';
const VIDEO = 'ynUYAm1-W6k';

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

describe('the lifebible-ttb source', () => {
  it('is in the index with its credit, the page it links back to and a start Off', () => {
    const entry = SERMON_INDEX.sources.find((s) => s.id === ID);
    expect(entry).toMatchObject({ kind: 'sermons', onByDefault: false, homepage: 'https://www.lifebibleministry.com/through-the-bible' });
    expect(entry?.name).toMatch(/Life Bible Ministry/);
    expect(entry?.credit).toMatch(/Pastor Paul LeBoutillier/);
    expect(entry?.books).toContain('isa');
    expect(entry?.rows).toBeGreaterThan(900);
  });

  it('has the Isaiah 1-4:1 row in isa.json, linking back to its page and holding the video the page embeds', () => {
    const file = JSON.parse(readFileSync(`public/sermons/${ID}/isa.json`, 'utf8')) as SermonBookFile;
    const row = file.rows.find((r) => r.id === 'isaiah.1');
    expect(row).toMatchObject({ title: 'Isaiah 1-4:1: God confronts the Kingdom of Judah', url: PAGE, preacher: 'Pastor Paul LeBoutillier', ref: { book: 'isa', chapter: 1, from: 1, toChapter: 4, to: 1 } });
    expect(row?.alt).toBe(`https://www.youtube.com/watch?v=${VIDEO}`);
    expect(videoOf(row!.alt!)).toEqual({ kind: 'youtube', id: VIDEO });
  });

  it('gives the sheet the row for Isaiah 2, which plays the video here and keeps the page as its link', async () => {
    const rows = await source().sermonsFor({ book: 'isa', chapter: 2 });
    const row = rows.find((r) => r.id === 'isaiah.1');
    expect(row).toMatchObject({ source: ID, open: { url: PAGE }, opensIn: 'web' });
    expect(videoOfRow(row!)).toEqual({ kind: 'youtube', id: VIDEO });
  });

  it('plays the alt only where it is a YouTube video: a page with a PDF alt, or with none, opens on the web', () => {
    const row = (alt?: string) => ({ id: 'a', source: ID, title: 'A', open: { url: PAGE }, opensIn: 'web' as const, ...(alt ? { alt } : {}) });
    expect(videoOfRow(row(`https://youtu.be/${VIDEO}`))).toEqual({ kind: 'youtube', id: VIDEO });
    expect(videoOfRow(row('https://www.spurgeongems.org/sermon/chs1.pdf'))).toBeUndefined();
    expect(videoOfRow(row())).toBeUndefined();
    expect(videoOfRow({ ...row(`https://youtu.be/${VIDEO}`), opensIn: 'logos' })).toBeUndefined();
  });

  it('has a switch, On | Off, Off to start, and Off drops its rows from the Sermons sheet', async () => {
    const lifebible = source();
    expect(lifebible.default).toBe('off');
    const setting = sermonSourceSetting(lifebible);
    expect(setting.key).toBe(`sermons.${ID}`);
    expect(setting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'on' }, { value: 'off' }] });
    const read = (value?: string) => (key: string) => (key === `sermons.${ID}` ? value : undefined);
    expect(enabledSources([lifebible], read()).map((s) => s.id)).toEqual([]);
    expect(enabledSources([lifebible], read('off')).map((s) => s.id)).toEqual([]);
    const on = enabledSources([lifebible], read('on'));
    expect(on.map((s) => s.id)).toEqual([ID]);
    expect((await on[0].sermonsFor({ book: 'isa', chapter: 1 })).length).toBeGreaterThan(0);
  });
});
