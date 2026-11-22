// A sermon row with no preaching text (no `ref`) shows on no verse and breaks nothing (mw-qtu3zvz.20): his Jimmy Evans archive (156 rows with dates and series and no Scripture) and Piper's and Bunyan's books
// (rows that only cite passages) are bundled as sources with no book file. The build counts such rows and writes the source with no books; the bundled source answers nothing for any chapter; the committed
// index says so. No network: a fixture for the build and the committed files.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CANON } from '../../src/data/canon';
import type { SermonIndex } from '../../src/data/sermonIndex';
import { runSermonsBuild } from '../../scripts/sermons-build';
import { bundledSources, forgetSermonFiles, LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';
import { sermonsForSources } from '../../src/sermons/sermonsFor';

const NO_REF = ['piper-logos', 'bunyan-logos', 'jimmy-evans-logos', 'kuyper-logos', 'worlds-great-sermons-logos', 'mcpherson-logos', 'strong-logos', 'eyton-logos', 'chapin-logos', 'pope-logos', 'smale-logos'];
const index = JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as SermonIndex;
const canonIndex = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: Array<{ code: string; verses: number[] }> };

const TOML = `id = "no-ref-logos"
name = "A list with no passages"
kind = "sermons"
licence = "Facts only"
credit = "A credit"
homepage = "https://www.logos.com/"
on_by_default = false
`;
const ROWS = [
  { id: 'SER2004.1.1', title: 'Session 1—“The Blessed Marriage”', url: 'https://ref.ly/logosres/LLS:JIMMYEVANSSA?art=SER2004.1.1', kind: 'link', preacher: 'Jimmy Evans', date: '2004-06-11', notes: 'Series: Blessed Marriage Seminar, part 1.' },
  { id: 'SER2004.1.2', title: 'Session 2', url: 'https://ref.ly/logosres/LLS:JIMMYEVANSSA?art=SER2004.1.2', kind: 'link', preacher: 'Jimmy Evans', cited: ['John.1.13'] },
].map((r) => JSON.stringify(r)).join('\n');

function workspace(rows: string) {
  const dir = mkdtempSync(join(tmpdir(), 'sermons-no-ref-'));
  const configFile = join(dir, 'sources.json');
  writeFileSync(configFile, JSON.stringify({ repo: 'https://github.com/o/r', commit: 'a'.repeat(40), sources: ['no-ref-logos'] }));
  const download = async (url: string, dest: string): Promise<void> => {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, url.endsWith('source.toml') ? TOML : rows);
  };
  const verses = (code: string): readonly number[] | undefined => canonIndex.books.find((b) => b.code === code)?.verses;
  return { dir, options: { configFile, rawDir: join(dir, 'raw'), outDir: join(dir, 'out'), themesOutDir: join(dir, 'themes'), download, verses } };
}

describe('the build, for a source whose rows name no passage', () => {
  it('counts each row as having no preaching text, writes the source with no books and no book file, and does not fail', async () => {
    const w = workspace(ROWS);
    const result = await runSermonsBuild(w.options);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({ id: 'no-ref-logos', read: 2, listed: 0, withoutRef: 2, omitted: [] });
    const out = JSON.parse(readFileSync(join(w.dir, 'out', 'index.json'), 'utf8')) as SermonIndex;
    expect(out.sources[0]).toMatchObject({ id: 'no-ref-logos', rows: 0, books: [], onByDefault: false });
    expect(out.sources[0].fingerprint).toMatch(/^[0-9a-f]{12}$/);
    expect(readdirSync(join(w.dir, 'out'), { recursive: true }).map(String).filter((f) => f.endsWith('.json') && f !== 'index.json')).toEqual([]);
  });

  it('writes the same bytes on a second run', async () => {
    const w = workspace(ROWS);
    await runSermonsBuild(w.options);
    expect((await runSermonsBuild(w.options)).written).toBe(0);
  });
});

describe('the committed bundle, for Piper, Bunyan, Jimmy Evans, Kuyper, The World’s Great Sermons, McPherson, Strong, Eyton, Chapin, Pope and Smale', () => {
  for (const id of NO_REF) {
    it(`${id} is in the index with no rows and no book, Off to start, and has no book file`, () => {
      const entry = index.sources.find((s) => s.id === id);
      expect(entry, id).toBeDefined();
      expect(entry).toMatchObject({ kind: 'sermons', rows: 0, books: [], onByDefault: false });
      expect(existsSync(`public/sermons/${id}`)).toBe(false);
    });
  }

  it('Jimmy Evans’s credit is his own archive, in Logos', () => {
    expect(index.sources.find((s) => s.id === 'jimmy-evans-logos')!.credit).toBe('Jimmy Evans, Jimmy Evans Sermon Archive, in Logos (Faithlife)');
  });

  it('each names the Logos book its rows open in', () => {
    expect(LOGOS_RESOURCES['jimmy-evans-logos']).toEqual(['LLS:JIMMYEVANSSA']);
    expect(LOGOS_RESOURCES['piper-logos']).toEqual(['LLS:86BDFD4BE2316756AFB52F8937D86322']);
    expect(LOGOS_RESOURCES['bunyan-logos']).toEqual(['LLS:WJB_BYNLST']);
    expect(LOGOS_RESOURCES['kuyper-logos']).toEqual(['LLS:TEASELEXKUYPROOT']);
    expect(LOGOS_RESOURCES['mcpherson-logos']).toEqual(['LLS:DVNHLNGSRMNS']);
    expect(LOGOS_RESOURCES['strong-logos']).toEqual(['LLS:PHILANDREL']);
    expect(LOGOS_RESOURCES['worlds-great-sermons-logos']).toHaveLength(10);
    expect(LOGOS_RESOURCES['eyton-logos']).toEqual(['LLS:BEATITUDES']);
    expect(LOGOS_RESOURCES['chapin-logos']).toEqual(['LLS:DSCRSSBTTDS']);
    expect(LOGOS_RESOURCES['pope-logos']).toEqual(['LLS:WITOTHERDISC']);
    expect(LOGOS_RESOURCES['smale-logos']).toEqual(['LLS:PNTCSTLBLSSNG']);
  });

  describe('on a verse', () => {
    beforeEach(() => {
      forgetSermonFiles();
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Response(readFileSync(`public${String(input).replace(/\?v=[0-9a-f]{12}$/, '')}`, 'utf8'), { status: 200 })));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('answers nothing for any chapter of any book, and asks for no file', async () => {
      const sources = bundledSources().filter((s) => NO_REF.includes(s.id));
      expect(sources.map((s) => s.id)).toEqual(NO_REF);
      for (const source of sources) {
        for (const book of CANON) expect(await source.sermonsFor({ book: book.code, chapter: 1 }), `${source.id} ${book.code}`).toEqual([]);
        expect(await source.sermonsFor({ book: 'luk', chapter: 8, from: 4 })).toEqual([]);
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it('adds nothing to the sheet of a verse', async () => {
      const found = await sermonsForSources(bundledSources().filter((s) => NO_REF.includes(s.id)), { book: 'luk', chapter: 8, from: 4 });
      expect(found).toEqual({ here: [], chapter: [] });
    });
  });
});
