// Settings after the library (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8 and 8): the Works row is gone, the library has a row the tutor cannot change, and the Settings search
// answers a book's title from the catalogue.
import { describe, expect, it } from 'vitest';
import { GROUPS, groupById, HOME_SECTIONS, isHomeRow, isTalkable, ROWS, rowOf, visibleRows } from '../../src/settings/rows';
import { groupIdOf, settingKeyOf, settingLink } from '../../src/settings/link';
import { MAX_BOOKS_FOUND, searchLibrary } from '../../src/settings/librarySearch';
import { settingOf } from '../../src/settings/registry';

describe('the rows of Settings after the library', () => {
  it('has no Works row any more', () => {
    expect(ROWS.some((r) => r.key === 'works')).toBe(false);
  });

  it('has a Your Logos library row on the Settings home, in no group, that is no setting and not talkable', () => {
    const row = rowOf('library');
    expect(row?.label).toBe('Your Logos library');
    expect(row?.section).toBe('library');
    expect(HOME_SECTIONS).toContain('library');
    expect(isHomeRow(row as NonNullable<typeof row>)).toBe(true);
    expect(row?.dependsOn).toBeUndefined();
    expect(GROUPS.some((g) => g.sections.includes('library'))).toBe(false);
    expect(settingOf('library')).toBeUndefined();
    expect(isTalkable('library')).toBe(false);
  });

  it('is the first row of the list, above the dial, and no row of Study resources', () => {
    expect(ROWS[0]?.key).toBe('library');
    expect(HOME_SECTIONS.indexOf('library')).toBeLessThan(HOME_SECTIONS.indexOf('dial'));
    expect(ROWS.filter((r) => r.section === 'resources').map((r) => r.key)).not.toContain('library');
    expect(groupById('study')?.hint).not.toMatch(/library/i);
  });

  it('is drawn whether Logos is on or off', () => {
    expect(visibleRows({ 'resource.logos': 'on', greekInterest: '5' }, '').map((r) => r.key)).toContain('library');
    expect(visibleRows({ 'resource.logos': 'off', greekInterest: '5' }, '').map((r) => r.key)).toContain('library');
    expect(visibleRows({}, 'your logos library').map((r) => r.key)).toContain('library');
  });

  it('has a link, which opens the home at the row and never a group page', () => {
    expect(settingLink('library')).toBe('#/settings?setting=library');
    expect(settingKeyOf('#/settings?setting=library')).toBe('library');
    expect(groupIdOf('#/settings?setting=library')).toBeNull();
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
