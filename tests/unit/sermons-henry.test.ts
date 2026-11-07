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

// mw-qtu3zvz.33: the Henry links were hand-made and landed a sermon or more late (Matthew 16:26's The Worth of the Soul, Sermon I opened the leaf of Sermon II).
// sermon-index 881cce1 re-found every url in the Archive's OCR; tests/fixtures/sermons/henry-sermons-8ee5cd7.jsonl is its rows.jsonl at 8ee5cd7, the first
// commit with them. Whoever moves the pin and rebuilds copies the new rows.jsonl over it, so the bundle never keeps a url the index has since corrected.
const SERMON_INDEX_PIN_WITH_LATE_HENRY_URLS = '64f9469ab73e6945c17b698be5eb908445f6bc6c';
type IndexRow = { id: string; ref?: string; url: string };

describe('the Henry urls in the sermon bundle (mw-qtu3zvz.33)', () => {
  const rows = readFileSync('tests/fixtures/sermons/henry-sermons-8ee5cd7.jsonl', 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as IndexRow);
  const henry = index.sources.find((s) => s.id === 'henry-sermons')!;
  const bundled = new Map<string, string>();
  for (const book of henry.books) {
    for (const row of (JSON.parse(readFileSync(`public/sermons/henry-sermons/${book}.json`, 'utf8')) as SermonBookFile).rows) bundled.set(row.id, row.url);
  }

  it('is pinned past the commit whose Henry urls were late', () => {
    expect(config.commit).not.toBe(SERMON_INDEX_PIN_WITH_LATE_HENRY_URLS);
  });

  it('holds, for every row of the index that has a preaching text, the url the index gives it', () => {
    const withText = rows.filter((row) => row.ref);
    expect(withText.length).toBeGreaterThan(40);
    for (const row of withText) expect(bundled.get(row.id), row.id).toBe(row.url);
  });

  it('opens Matthew 16:26 Sermon I at the leaf that prints its head', () => {
    expect(bundled.get('worth-of-the-soul-1')).toBe('https://archive.org/details/miscellaneouswor00henr/page/n1248');
  });
});
