// Enduring Word (David Guzik's commentary on the web, mw-1l901so.1): the chapter's address by the site's own book slugs, which books it covers, and the row the chooser draws in the place of a DGCB volume.
// Each slug was checked against the site's own table (the `slugs` of the EWXref resolver in every commentary page, by USFM code) and each address of a chapter fetched, 2026-11-23.
import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { hasDgcb, withEnduringWord, type InLogosRow } from '../../src/library/inLogos';
import type { CatalogueEntry } from '../../src/resources/catalogue';
import { ENDURING_WORD_ENTRY, ENDURING_WORD_SLUGS, enduringWordRow, enduringWordUrl, hasEnduringWord } from '../../src/resources/enduringWord';

describe('the chapter address', () => {
  it.each([
    ['jhn', 3, 'https://enduringword.com/bible-commentary/john-3/'],
    ['1jn', 2, 'https://enduringword.com/bible-commentary/1-john-2/'],
    ['psa', 73, 'https://enduringword.com/bible-commentary/psalm-73/'],
    ['sng', 2, 'https://enduringword.com/bible-commentary/song-of-solomon-2/'],
    ['oba', 1, 'https://enduringword.com/bible-commentary/obadiah-1/'],
  ])('%s %i is the site’s own', (book, chapter, url) => {
    expect(enduringWordUrl(book, chapter)).toBe(url);
  });

  it('holds a slug for each of the 66 books and none for a book it has not', () => {
    expect(Object.keys(ENDURING_WORD_SLUGS).sort()).toEqual(BOOKS.map((b) => b.code).sort());
    expect(new Set(Object.values(ENDURING_WORD_SLUGS)).size).toBe(66);
    expect(hasEnduringWord('tob')).toBe(false);
    expect(enduringWordUrl('tob', 1)).toBeUndefined();
  });

  it('is the reader’s row: the page’s slug is its id and the chapter its title', () => {
    expect(enduringWordRow({ book: 'jhn', chapter: 3 })).toMatchObject({ id: 'john-3', source: 'enduring-word', title: 'John 3 · Enduring Word', opensIn: 'web', open: { url: 'https://enduringword.com/bible-commentary/john-3/' } });
    expect(enduringWordRow({ book: 'tob', chapter: 1 })).toBeUndefined();
  });
});

const entry = (resource: string, short: string, covers: string[]): CatalogueEntry => ({ resource, kind: 'commentary', title: short, short, lang: 'en', opens: 'verse', value: 'a test book', covers, via: 'id' });
const row = (e: CatalogueEntry): InLogosRow => ({ entry: e, state: 'on', link: { url: `logosres:${e.resource}`, fallback: `https://ref.ly/${e.resource}` } });

describe('where the row stands among the commentaries', () => {
  const before = entry('LLS:A', 'Commentary A', ['jhn']);
  const dgcb = entry('LLS:GUZIKCOMM43JN', 'DGCB Jn', ['jhn']);
  const after = entry('LLS:B', 'Commentary B', ['jhn']);
  const place = { book: 'jhn', chapter: 3, verse: 16 };
  const names = (rows: readonly InLogosRow[]) => rows.map((r) => r.entry.short);

  it('is added where he holds no DGCB volume of the book, at the section of the verse (John 3:16)', () => {
    const rows = withEnduringWord([row(before), row(after)], [before, after], place);
    expect(names(rows)).toEqual(['Commentary A', 'Commentary B', ENDURING_WORD_ENTRY.short]);
    expect(rows[2]?.link.url).toBe('https://enduringword.com/bible-commentary/john-3/#section-6');
  });

  it('stands where the DGCB volume would in the catalogue’s order, so it is not folded away under “N more”', () => {
    expect(names(withEnduringWord([row(before), row(after)], [before, dgcb, after], place))).toEqual(['Commentary A', ENDURING_WORD_ENTRY.short, 'Commentary B']);
  });

  it('is not added where he holds the DGCB volume of the book', () => {
    const rows = [row(before), row(dgcb)];
    expect(hasDgcb(rows)).toBe(true);
    expect(names(withEnduringWord(rows, [before, dgcb, after], place))).toEqual(['Commentary A', 'DGCB Jn']);
  });

  it('is not added for a book the site has no commentary of', () => {
    expect(withEnduringWord([], [], { book: 'tob', chapter: 1, verse: 1 })).toEqual([]);
  });
});
