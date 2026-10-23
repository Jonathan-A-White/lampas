// Settings after the library (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8 and 8): the Works row is gone, the library has a row the tutor cannot change, and the Settings search
// answers a book's title from the catalogue.
import { describe, expect, it } from 'vitest';
import { isTalkable, ROWS, rowOf, visibleRows } from '../../src/settings/rows';
import { MAX_BOOKS_FOUND, searchLibrary } from '../../src/settings/librarySearch';
import { settingOf } from '../../src/settings/registry';

describe('the rows of Settings after the library', () => {
  it('has no Works row any more', () => {
    expect(ROWS.some((r) => r.key === 'works')).toBe(false);
  });

  it('has a Your Logos library row in Study resources, drawn only while Logos is on, that is no setting and not talkable', () => {
    const row = rowOf('library');
    expect(row?.label).toBe('Your Logos library');
    expect(row?.section).toBe('resources');
    expect(row?.dependsOn?.key).toBe('resource.logos');
    expect(settingOf('library')).toBeUndefined();
    expect(isTalkable('library')).toBe(false);
  });

  it('draws the library row right after the Logos switch', () => {
    const keys = ROWS.filter((r) => r.section === 'resources').map((r) => r.key);
    expect(keys[keys.indexOf('resource.logos') + 1]).toBe('library');
  });

  it('shows the library row while Logos is on and hides it while it is off', () => {
    expect(visibleRows({ 'resource.logos': 'on', greekInterest: '5' }, '').map((r) => r.key)).toContain('library');
    expect(visibleRows({ 'resource.logos': 'off', greekInterest: '5' }, '').map((r) => r.key)).not.toContain('library');
  });
});

describe('the Settings search over the library (searchLibrary)', () => {
  it("finds a book by its short name and says how many more there are", () => {
    const { books, total } = searchLibrary('bdag');
    expect(books[0]?.short).toBe('BDAG');
    expect(total).toBeGreaterThanOrEqual(books.length);
  });

  it('finds a book by its full title or its author', () => {
    expect(searchLibrary('greek-english lexicon').books.length).toBeGreaterThan(0);
    expect(searchLibrary('calvin').books.length).toBeGreaterThan(0);
  });

  it('shows at most a few and counts the rest', () => {
    const { books, total } = searchLibrary('e');
    expect(books).toHaveLength(MAX_BOOKS_FOUND);
    expect(total).toBeGreaterThan(MAX_BOOKS_FOUND);
  });

  it('finds nothing for an empty or a meaningless search', () => {
    expect(searchLibrary('   ')).toEqual({ books: [], total: 0 });
    expect(searchLibrary('zzzzqqq').total).toBe(0);
  });
});
