// Settings after the library (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8 and 8): the Works row is gone, the library has a row the tutor cannot change, and the Settings search
// answers a book's title from the catalogue.
import { describe, expect, it } from 'vitest';
import { GROUPS, groupById, HOME_SECTIONS, isHomeRow, isTalkable, ROWS, rowOf, TOOL_ROWS, visibleRows, visibleToolRows } from '../../src/settings/rows';
import { groupIdOf, movedTool, settingKeyOf, settingLink } from '../../src/settings/link';
import { MAX_BOOKS_FOUND, searchLibrary } from '../../src/settings/librarySearch';
import { settingOf } from '../../src/settings/registry';

describe('the rows of Settings after the library', () => {
  it('has no Works row any more', () => {
    expect(ROWS.some((r) => r.key === 'works')).toBe(false);
  });

  it('has a Your Logos library row among the Tools (mw-5r3p30.754), in no Settings group or home section, that is no setting and not talkable', () => {
    const row = TOOL_ROWS.find((r) => r.key === 'library');
    expect(row?.label).toBe('Your Logos library');
    expect(row?.section).toBe('tools');
    expect(rowOf('library')).toBeUndefined();
    expect(HOME_SECTIONS).not.toContain('tools');
    expect(GROUPS.flatMap((g) => g.sections)).not.toContain('tools');
    expect(row?.dependsOn?.key).toBe('resource.logos');
    expect(settingOf('library')).toBeUndefined();
    expect(isTalkable('library')).toBe(false);
  });

  it('is no row of Study resources any more: the Logos switch is followed by the Bibles in Logos', () => {
    const keys = ROWS.filter((r) => r.section === 'resources').map((r) => r.key);
    expect(keys.slice(keys.indexOf('resource.logos'), keys.indexOf('resource.logos') + 2)).toEqual(['resource.logos', 'logosBible']);
    expect(ROWS.filter(isHomeRow).map((r) => r.key)).not.toContain('library');
    expect(groupById('study')?.hint).toBe('Links to the study tools you own, Bible in Logos and maps.');
  });

  it('is drawn only while Logos is on (mw-rfjjzd.23); a search for it finds the Logos switch to turn on first', () => {
    expect(visibleToolRows({ 'resource.logos': 'on', greekInterest: '5' }, '').map((r) => r.key)).toContain('library');
    expect(visibleToolRows({ 'resource.logos': 'off', greekInterest: '5' }, '').map((r) => r.key)).not.toContain('library');
    expect(visibleToolRows({ 'resource.logos': 'on' }, 'your logos library').map((r) => r.key)).toContain('library');
    expect(visibleRows({ 'resource.logos': 'on', greekInterest: '5' }, '').map((r) => r.key)).not.toContain('library');
  });

  it('has no Settings link any more: the old address names the Library, which the Settings screen opens in its place', () => {
    expect(settingLink('library')).toBeNull();
    expect(settingKeyOf('#/settings?setting=library')).toBeNull();
    expect(groupIdOf('#/settings?setting=library')).toBeNull();
    expect(movedTool('#/settings?setting=library')).toBe('library');
    expect(movedTool('#/settings?setting=link.words')).toBe('words');
    expect(movedTool('#/settings?setting=textSize')).toBeNull();
    expect(movedTool('#/words?setting=library')).toBeNull();
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
