// The committed sermon bundle holds Matthew Henry's source (mw-qtu3zvz.8): data/sermons/sources.json pins a sermon-index commit that has
// sources/henry-sermons and lists it, and scripts/sermons-build.ts has bundled it into public/sermons/. No network: the committed files only.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { SermonBookFile, SermonIndex } from '../../src/data/sermonIndex';

const config = JSON.parse(readFileSync('data/sermons/sources.json', 'utf8')) as { commit: string; sources: string[] };
const index = JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as SermonIndex;

// the pin before sources/henry-sermons landed (efac700 is the first commit with it)
const STALE_PIN = '08484ad3fec810dd72ac95acd3d222d19b25e6dd';

describe('the Henry source in the sermon bundle', () => {
  it('is listed in sources.json at a commit that has it', () => {
    expect(config.sources).toContain('henry-sermons');
    expect(config.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(config.commit).not.toBe(STALE_PIN);
  });

  it('is in index.json with its licence, credit and counts', () => {
    const henry = index.sources.find((s) => s.id === 'henry-sermons');
    expect(henry).toBeDefined();
    expect(henry!.kind).toBe('sermons');
    expect(henry!.licence).toMatch(/Archive/);
    expect(henry!.credit).toMatch(/Matthew Henry/);
    expect(henry!.rows).toBeGreaterThan(0);
    expect(henry!.books.length).toBeGreaterThan(0);
    expect(henry!.fingerprint).toMatch(/^[0-9a-f]{12}$/);
    // the Spurgeon source stays beside it
    expect(index.sources.map((s) => s.id)).toEqual(expect.arrayContaining(['spurgeon-ccel', 'henry-sermons']));
  });

  it('has a book file with rows for each book it lists', () => {
    const henry = index.sources.find((s) => s.id === 'henry-sermons')!;
    let total = 0;
    for (const book of henry.books) {
      const path = `public/sermons/henry-sermons/${book}.json`;
      expect(existsSync(path), path).toBe(true);
      const file = JSON.parse(readFileSync(path, 'utf8')) as SermonBookFile;
      expect(file.rows.length).toBeGreaterThan(0);
      for (const row of file.rows) {
        expect(row.ref.book).toBe(book);
        expect(row.preacher).toBe('Matthew Henry');
        expect(row.url).toMatch(/^https:\/\/archive\.org\//);
      }
      total += file.rows.length;
    }
    expect(total).toBeGreaterThanOrEqual(henry.rows);
  });
});
