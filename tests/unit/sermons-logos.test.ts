// The committed sermon bundle holds his three Logos sermon archives (mw-qtu3zvz.12): data/sermons/sources.json pins a sermon-index commit that has greg-laurie-logos, jd-greear-logos and skip-heitzig-logos
// (mw-qtu3zvz.11) and lists them, scripts/sermons-build.ts has bundled them into public/sermons/, each row's link is the ref.ly link that opens the sermon in Logos for an owner of the archive, and the three
// start Off. No network: the committed files only.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { SermonBookFile, SermonIndex } from '../../src/data/sermonIndex';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { enabledSources } from '../../src/sermons/enabled';

const config = JSON.parse(readFileSync('data/sermons/sources.json', 'utf8')) as { commit: string; sources: string[] };
const index = JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as SermonIndex;

// the pin before the Logos archives landed in the sermon-index repository (S1, mw-qtu3zvz.11, landed as 64f9469)
const STALE_PIN = 'efac7003bfef04bbcfc68e50c97fafda8fecdbc7';
const ARCHIVES = [
  { id: 'greg-laurie-logos', resource: 'GRGLRSRMNRCH', preacher: /Greg Laurie/, credit: 'Greg Laurie Sermon Archive (Harvest Ministries), in Logos (Faithlife)' },
  { id: 'jd-greear-logos', resource: 'JDGRRSRMNRCHV', preacher: /Greear/, credit: 'J. D. Greear Sermon Archive, in Logos (Faithlife)' },
  { id: 'skip-heitzig-logos', resource: 'SKPHTZGSRMN', preacher: /Heitzig/, credit: 'Skip Heitzig Sermon Archive, in Logos (Faithlife)' },
];

describe('the Logos archives in the sermon bundle', () => {
  it('are listed in sources.json at a commit that has them', () => {
    expect(config.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(config.commit).not.toBe(STALE_PIN);
    expect(config.sources).toEqual(expect.arrayContaining(ARCHIVES.map((a) => a.id)));
  });

  for (const archive of ARCHIVES) {
    describe(archive.id, () => {
      const entry = index.sources.find((s) => s.id === archive.id);

      it('is in index.json with its licence, credit and counts, and starts Off', () => {
        expect(entry).toBeDefined();
        expect(entry!.kind).toBe('sermons');
        expect(entry!.credit).toBe(archive.credit);
        expect(entry!.rows).toBeGreaterThan(100);
        expect(entry!.books.length).toBeGreaterThan(0);
        expect(entry!.fingerprint).toMatch(/^[0-9a-f]{12}$/);
        expect(entry!.onByDefault).toBe(false);
      });

      it('has a book file with rows for each book it lists, each linking the sermon in Logos', () => {
        let total = 0;
        for (const book of entry!.books) {
          const path = `public/sermons/${archive.id}/${book}.json`;
          expect(existsSync(path), path).toBe(true);
          const file = JSON.parse(readFileSync(path, 'utf8')) as SermonBookFile;
          expect(file.rows.length).toBeGreaterThan(0);
          for (const row of file.rows) {
            expect(row.ref.book).toBe(book);
            expect(row.url).toMatch(new RegExp(`^https://ref\\.ly/logosres/LLS:${archive.resource}\\?art=`));
            expect(row.preacher ?? '').toMatch(archive.preacher);
          }
          total += file.rows.length;
        }
        expect(total).toBeGreaterThanOrEqual(entry!.rows);
      });
    });
  }

  it('keeps Spurgeon and Henry On to start, with no key to say so', () => {
    for (const id of ['spurgeon-ccel', 'henry-sermons']) {
      const entry = index.sources.find((s) => s.id === id)!;
      expect(entry.onByDefault).toBeUndefined();
    }
  });

  it('lists Greg Laurie’s “Who Is Man” under Genesis 1', () => {
    const file = JSON.parse(readFileSync('public/sermons/greg-laurie-logos/gen.json', 'utf8')) as SermonBookFile;
    const row = file.rows.find((r) => r.id === 'YEAR.1996.6');
    expect(row).toMatchObject({ title: 'Who Is Man', ref: { book: 'gen', chapter: 1 } });
  });
});

describe('the bundled Logos sources', () => {
  beforeEach(() => {
    forgetSermonFiles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => new Response(readFileSync(`public${String(input).replace(/\?v=[0-9a-f]{12}$/, '')}`, 'utf8'), { status: 200 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const sources = () => bundledSources();
  const logos = () => sources().filter((s) => ARCHIVES.some((a) => a.id === s.id));

  it('are three, Off to start, and On only where their switch says so', () => {
    expect(logos().map((s) => s.id)).toEqual(ARCHIVES.map((a) => a.id));
    for (const source of logos()) expect(source.default).toBe('off');
    expect(sources().find((s) => s.id === 'spurgeon-ccel')!.default).toBe('on');
    const all = sources();
    expect(enabledSources(all, () => undefined).map((s) => s.id)).toEqual(['spurgeon-ccel', 'henry-sermons']);
    expect(enabledSources(all, (key) => (key === 'sermons.greg-laurie-logos' ? 'on' : undefined)).map((s) => s.id)).toContain('greg-laurie-logos');
    expect(enabledSources(all, (key) => (key === 'sermons.spurgeon-ccel' ? 'off' : undefined)).map((s) => s.id)).not.toContain('spurgeon-ccel');
  });

  it('give rows that open in Logos by the ref.ly link', async () => {
    const greg = logos()[0];
    const rows = await greg.sermonsFor({ book: 'gen', chapter: 1 });
    const who = rows.find((r) => r.title === 'Who Is Man');
    expect(who).toMatchObject({ source: 'greg-laurie-logos', opensIn: 'logos', open: { url: expect.stringMatching(/^https:\/\/ref\.ly\/logosres\/LLS:GRGLRSRMNRCH\?art=/) } });
  });
});
