// tests/unit/sermon-source-list.test.ts — the one Sermons list (mw-qtu3zvz.92, docs/design/sermon-sources.md): what it holds for a reader (src/sermons/sourceList.ts), the shelf rules behind it
// (a sermon book has no Pin, Pinned becomes On, a list stands for its books), what the Library and "In another book…" no longer hold, the In Logos group of the Sermons sheet, and the words that
// name the one place (Help, the Library's own help, the tutor's instructions).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../../src/data/db';
import { carrySermonShelf, setShelfStates, setState, shelfOf, type ShelfState } from '../../src/data/repositories';
import { HELP_PAGES } from '../../src/help';
import { inLogosGroups, inLogosRows } from '../../src/library/inLogos';
import { booksOn, infoOf, KIND_INFO, LIBRARY_KINDS, SERMON_SOURCES_PLACE } from '../../src/library/kinds';
import { CATALOGUE, entriesOf, entryOf, type CatalogueEntry } from '../../src/resources/catalogue';
import { searchLibrary } from '../../src/settings/librarySearch';
import { sermonSourcesLink, sermonSourcesOf } from '../../src/settings/link';
import { ROWS, isTalkable } from '../../src/settings/rows';
import { logosArchives, SERMON_BOOKS } from '../../src/sermons/sources/logos';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';
import { countLine, filingName, GROUP_WORDS, inOrder, onLine, sourceList, type SourceInput } from '../../src/sermons/sourceList';
import type { SermonSource } from '../../src/sermons/types';
import '../support/grinds-in-graph';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const source = (id: string, name: string, more: Partial<SermonSource> = {}): SermonSource => ({
  id,
  name,
  homepage: `https://${id}.test`,
  credit: name,
  describe: 'Listed by passage.',
  default: 'on',
  sermonsFor: async () => [],
  ...more,
});

const GREG = 'LLS:GRGLRSRMNRCH';
const SPURGEON = source('spurgeon-ccel', "Spurgeon's sermons (CCEL)");
const HENRY = source('henry-sermons', "Matthew Henry's sermons (Internet Archive scans)");
const LAURIE = source('greg-laurie-logos', "Greg Laurie's sermons (Logos archive)", { default: 'off', resources: [GREG] });
const WESLEY = source('wesley-logos', "John Wesley's sermons (Logos library)", { default: 'off', resources: LOGOS_RESOURCES['wesley-logos'] });
const SERVICE = source('brookfield', 'Brookfield First', { default: 'off', describe: 'Listed by the sermon index online.' });

const SERMONS = entriesOf('sermons');
const UNDER = new Set(Object.values(LOGOS_RESOURCES).flat());
/** Sermon books of the catalogue that no bundled list stands for. */
const LOOSE = SERMONS.filter((e) => !UNDER.has(e.resource));
const MARKED = CATALOGUE.filter((e) => e.kind !== 'sermons' && e.alsoSermons);
const COUNTS: Record<string, number> = { 'spurgeon-ccel': 3467, 'henry-sermons': 45, 'greg-laurie-logos': 1091 };

const input = (more: Partial<SourceInput> = {}): SourceInput => ({
  sources: [SPURGEON, HENRY, LAURIE, WESLEY, SERVICE],
  books: SERMON_BOOKS,
  sermonCount: (id) => COUNTS[id],
  owned: new Set<string>(),
  logosOn: true,
  read: () => undefined,
  shelf: new Map<string, ShelfState>(),
  ...more,
});

describe('the one list of sermon sources', () => {
  it('holds only the web lists for a reader with no Logos: no book, no Logos list, nothing hidden', () => {
    const list = sourceList(input({ logosOn: false }));
    expect(list.items.map((i) => i.name)).toEqual(["Spurgeon's sermons", "Matthew Henry's sermons", 'Brookfield First']);
    expect(list.items.every((i) => i.group === 'listed' && i.sort === 'list')).toBe(true);
    expect(list.hidden).toBe(0);
  });

  it('names a list without its bracket and says how many sermons and where they open', () => {
    const list = sourceList(input({ owned: new Set([GREG]) }));
    const byId = new Map(list.items.map((i) => [i.id, i]));
    expect(byId.get('sermons.spurgeon-ccel')).toMatchObject({ name: "Spurgeon's sermons", detail: '3,467 sermons · on the web', on: true });
    expect(byId.get('sermons.greg-laurie-logos')).toMatchObject({ name: "Greg Laurie's sermons", detail: '1,091 sermons · in Logos', on: false, group: 'listed' });
    // a source that does not say how many has no number
    expect(byId.get('sermons.brookfield')).toMatchObject({ detail: 'on the web', on: false });
  });

  it('lists a Logos list only when his import holds one of its books, and the list stands for those books: they have no row', () => {
    const none = sourceList(input());
    expect(none.items.some((i) => i.id === 'sermons.greg-laurie-logos')).toBe(false);
    const owned = new Set([GREG, ...LOGOS_RESOURCES['wesley-logos']]);
    const list = sourceList(input({ owned }));
    expect(list.items.filter((i) => i.sort === 'list').map((i) => i.id)).toEqual(expect.arrayContaining(['sermons.greg-laurie-logos', 'sermons.wesley-logos']));
    expect(list.items.some((i) => owned.has(i.id))).toBe(false);
    // the search finds a list by the title of a book under it
    const wesley = list.items.find((i) => i.id === 'sermons.wesley-logos')!;
    expect(wesley.search.toLowerCase()).toContain(entryOf('LLS:36.0.11')!.title.toLowerCase());
    expect(wesley.search).toContain('Logos');
  });

  it('lists each sermon book his import holds once, in the second group, Off | On from his shelf with Pinned read as On', () => {
    const [a, b, c] = LOOSE;
    const list = sourceList(input({ owned: new Set([a.resource, b.resource]), shelf: new Map<string, ShelfState>([[a.resource, 'pinned'], [c.resource, 'on']]) }));
    const books = list.items.filter((i) => i.sort === 'book');
    expect(books.map((i) => i.id).sort()).toEqual([a.resource, b.resource].sort());
    expect(books.every((i) => i.group === 'books')).toBe(true);
    expect(books.find((i) => i.id === a.resource)).toMatchObject({ name: a.short, title: a.title, on: true });
    expect(books.find((i) => i.id === b.resource)!.on).toBe(false);
  });

  it('lists a book with more than sermons too, saying where else it lives', () => {
    expect(MARKED.map((e) => e.resource).sort()).toEqual(['LLS:6.60.6', 'LLS:6.60.7', 'LLS:HMLSSTJHNCHRYSTM10', 'LLS:SLSRHMTRTSTGSTN']);
    expect(MARKED.every((e) => e.kind === 'commentary')).toBe(true);
    const augustine = entryOf('LLS:SLSRHMTRTSTGSTN')!;
    const list = sourceList(input({ owned: new Set([augustine.resource]), shelf: new Map<string, ShelfState>([[augustine.resource, 'pinned']]) }));
    expect(list.items.find((i) => i.id === augustine.resource)).toMatchObject({ group: 'books', also: 'commentary', on: true, detail: 'A Library of Fathers of the Holy Catholic Church' });
  });

  it('lists no Logos source while Logos is off, and counts the ones his import holds that are hidden', () => {
    const owned = new Set([GREG, LOOSE[0].resource, LOOSE[1].resource]);
    const list = sourceList(input({ owned, logosOn: false, read: (key) => (key === 'sermons.greg-laurie-logos' ? 'on' : undefined), shelf: new Map<string, ShelfState>([[LOOSE[0].resource, 'on']]) }));
    expect(list.items.map((i) => i.id)).toEqual(['sermons.spurgeon-ccel', 'sermons.henry-sermons', 'sermons.brookfield']);
    expect(list.hidden).toBe(3);
    expect(list.hiddenOn).toBe(2);
  });

  it('reads a list’s switch as saved, else its default', () => {
    const list = sourceList(input({ read: (key) => (key === 'sermons.spurgeon-ccel' ? 'off' : key === 'sermons.brookfield' ? 'on' : undefined) }));
    expect(Object.fromEntries(list.items.map((i) => [i.id, i.on]))).toEqual({ 'sermons.spurgeon-ccel': false, 'sermons.henry-sermons': true, 'sermons.brookfield': true });
  });

  it('files a group with what is on first and then by name, passing over a leading The and reading a number as a number', () => {
    expect(filingName('The Beatitudes')).toBe('Beatitudes');
    expect(filingName('A Call to Prayer')).toBe('Call to Prayer');
    expect(filingName('Anselm')).toBe('Anselm');
    const item = (id: string, name: string, on: boolean, group: 'listed' | 'books' = 'books') => ({ id, sort: 'book' as const, group, name, title: name, search: '', on });
    const ordered = inOrder([
      item('1', 'Sermons, Volume 10', false),
      item('2', 'Sermons, Volume 2', false),
      item('3', 'The Beatitudes', false),
      item('4', 'Princeton Sermons', true),
      item('5', 'Zion', false, 'listed'),
      item('6', 'Anselm', false),
    ]);
    expect(ordered.map((i) => i.name)).toEqual(['Zion', 'Princeton Sermons', 'Anselm', 'The Beatitudes', 'Sermons, Volume 2', 'Sermons, Volume 10']);
  });

  it('says its counts in the words of the design', () => {
    expect(countLine(17, 120)).toBe('17 of 120 on');
    expect(countLine(0, 120)).toBe('none of 120 on');
    expect(onLine(17)).toBe('17 on');
    expect(onLine(0)).toBe('none on');
    expect(GROUP_WORDS.listed.title).toBe('Listed by passage');
    expect(GROUP_WORDS.books.title).toBe('Logos books, at the verse');
  });
});

describe('a sermon book on the shelf', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
  }, ASYNC_WAIT_MS);

  it('has no Pin: a pin is refused, and On and Off are kept', async () => {
    const book = LOOSE[0].resource;
    expect(await setState(book, 'pinned')).toEqual({ ok: false, reason: 'no-pin-for-sermons' });
    expect(await setState(book, 'on')).toEqual({ ok: true });
    expect((await shelfOf('sermons')).map((r) => [r.id, r.state])).toEqual([[book, 'on']]);
  });

  it('carries over: a Pinned sermon book becomes On, On stays On, and a Pinned commentary stays Pinned', async () => {
    const [a, b] = LOOSE;
    const commentary = MARKED[0];
    await db.library.bulkPut([
      { id: a.resource, kind: 'sermons', state: 'pinned', since: 1 },
      { id: b.resource, kind: 'sermons', state: 'on', since: 2 },
      { id: commentary.resource, kind: 'commentary', state: 'pinned', since: 3 },
    ]);
    await carrySermonShelf();
    const states = new Map((await shelfOf()).map((r) => [r.id, r.state]));
    expect(states.get(a.resource)).toBe('on');
    expect(states.get(b.resource)).toBe('on');
    expect(states.get(commentary.resource)).toBe('pinned');
  });

  it('carries a list’s books over to the list: On where its switch was never touched and one of its books was On or Pinned; a switch he set stays', async () => {
    await db.library.bulkPut([
      { id: GREG, kind: 'sermons', state: 'pinned', since: 1 },
      { id: 'LLS:36.0.12', kind: 'sermons', state: 'on', since: 1 },
    ]);
    await db.settings.put({ key: 'sermons.whitefield-logos', value: 'off' });
    await carrySermonShelf();
    const saved = Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value]));
    expect(saved['sermons.greg-laurie-logos']).toBe('on');
    expect(saved['sermons.whitefield-logos']).toBe('off');
    // a list none of whose books is on is left alone, at its default
    expect(saved['sermons.jd-greear-logos']).toBeUndefined();
  });

  it('takes many switches at once, and puts back what was there', async () => {
    const [a, b] = LOOSE;
    const commentary = MARKED[0];
    await db.library.bulkPut([{ id: commentary.resource, kind: 'commentary', state: 'pinned', since: 3 }]);
    await setShelfStates([{ resource: a.resource, state: 'on' }, { resource: b.resource, state: 'on' }, { resource: commentary.resource, state: 'off' }]);
    expect(new Map((await shelfOf()).map((r) => [r.id, r.state]))).toEqual(new Map([[a.resource, 'on'], [b.resource, 'on']]));
    await setShelfStates([{ resource: a.resource, state: 'off' }, { resource: commentary.resource, state: 'pinned' }]);
    expect(new Map((await shelfOf()).map((r) => [r.id, r.state]))).toEqual(new Map([[commentary.resource, 'pinned'], [b.resource, 'on']]));
  });
});

describe('the Library after the change', () => {
  it('has eight kinds and no Sermons: a sermon book is not a kind of the Library, nor counted among its books', () => {
    expect([...LIBRARY_KINDS]).toEqual(['lexicon', 'grammar', 'greek-text', 'hebrew-text', 'interlinear', 'commentary', 'bible', 'devotional']);
    expect(KIND_INFO.map((i) => i.plural)).toEqual(['Lexicons', 'Grammars', 'Greek texts', 'Hebrew texts', 'Interlinears', 'Commentaries', 'Bibles', 'Devotionals']);
    expect(booksOn(new Map<string, ShelfState>([[LOOSE[0].resource, 'on']]))).toBe(0);
  });

  it('says in its own help where sermon sources are switched, and no kind speaks of a Pin for sermons', () => {
    expect(SERMON_SOURCES_PLACE).toBe('Settings > Study resources > Sermons > Sermon sources');
    expect(infoOf('sermons').help).toContain(SERMON_SOURCES_PLACE);
    expect(infoOf('sermons').help).not.toMatch(/Pin/);
    expect(infoOf('sermons').steps).toBe('on');
  });

  it('opens the old Library > Sermons address as the one list, at the book it named', () => {
    expect(sermonSourcesLink()).toBe('#/settings?sources=sermons');
    expect(sermonSourcesOf('#/settings?sources=sermons')).toEqual({});
    expect(sermonSourcesOf(sermonSourcesLink(GREG))).toEqual({ at: GREG });
    // a link to a source's setting (the tutor's, a Settings search result) is the page at that source's row
    expect(sermonSourcesOf('#/settings?setting=sermons.spurgeon-ccel')).toEqual({ at: 'sermons.spurgeon-ccel' });
    expect(sermonSourcesOf('#/settings?setting=textSize')).toBeNull();
    expect(sermonSourcesOf('#/settings?group=study')).toBeNull();
    expect(sermonSourcesOf('#/library?kind=sermons')).toBeNull();
  });

  it('"In another book…" holds no sermon book: no Sermon archives group at a verse, in either Testament', () => {
    const shelf = new Map<string, ShelfState>(SERMONS.slice(0, 3).map((e) => [e.resource, 'on']));
    for (const place of [{ book: 'rom', chapter: 5, verse: 8 }, { book: 'psa', chapter: 23, verse: 1 }]) {
      const rows = inLogosRows(CATALOGUE, shelf, place);
      expect(rows.filter((r) => r.entry.kind === 'sermons')).toEqual([]);
      expect(inLogosGroups(rows, place).map((g) => g.title).join(' ')).not.toMatch(/Sermon/);
    }
  });

  it('the Settings search answers a sermon book only when it is in the one list', () => {
    const book = LOOSE.find((e) => /Princeton/.test(e.title)) ?? LOOSE[0];
    const words = book.short.split(/[,:]/)[0];
    expect(searchLibrary(words).books.map((e) => e.resource)).not.toContain(book.resource);
    expect(searchLibrary(words, new Set([book.resource])).books.map((e) => e.resource)).toContain(book.resource);
  });
});

describe('Settings > Study resources > Sermons', () => {
  it('has the row Sermon sources before Open web sermons in, a door the tutor does not change', () => {
    const section = ROWS.filter((r) => r.section === 'sermons' && !r.key.startsWith('sermons.')).map((r) => r.label);
    expect(section).toEqual(['Sermon sources', 'Open web sermons in']);
    expect(isTalkable('sermonSources')).toBe(false);
  });
});

describe('In Logos on the Sermons sheet', () => {
  const place = { book: 'rom', chapter: 5, from: 8 };
  const owned = (entries: readonly CatalogueEntry[]): Set<string> => new Set(entries.map((e) => e.resource));

  it('lists the sermon books that are On by name, a once-Pinned one in its place and not first', () => {
    const [a, b] = [...LOOSE.slice(0, 2)].sort((x, y) => x.short.localeCompare(y.short));
    const rows = logosArchives(place, new Map<string, ShelfState>([[b.resource, 'pinned'], [a.resource, 'on']]), SERMON_BOOKS, owned([a, b]));
    expect(rows.map((r) => r.id)).toEqual([a.resource, b.resource]);
  });

  it('draws no row for a book a list stands for: each of its sermons is already a link into it', () => {
    const rows = logosArchives(place, new Map<string, ShelfState>([[GREG, 'on'], [LOOSE[0].resource, 'on']]), SERMON_BOOKS, owned([entryOf(GREG)!, LOOSE[0]]));
    expect(rows.map((r) => r.id)).toEqual([LOOSE[0].resource]);
  });

  it('offers a book with more than sermons only at the verses it covers, and only when his import holds it', () => {
    const augustine = entryOf('LLS:SLSRHMTRTSTGSTN')!;
    const shelf = new Map<string, ShelfState>([[augustine.resource, 'pinned']]);
    expect(logosArchives({ book: 'jhn', chapter: 3, from: 16 }, shelf, SERMON_BOOKS, owned([augustine])).map((r) => r.id)).toEqual([augustine.resource]);
    expect(logosArchives(place, shelf, SERMON_BOOKS, owned([augustine]))).toEqual([]);
    expect(logosArchives({ book: 'jhn', chapter: 3, from: 16 }, shelf, SERMON_BOOKS, new Set())).toEqual([]);
  });
});

describe('the words that point at the one list', () => {
  const root = join(__dirname, '../..');

  it('Help says where sermon sources are switched', () => {
    const page = HELP_PAGES.find((p) => p.id === 'library')!;
    expect(page.body.join(' ')).toContain('Settings > Study resources > Sermons > Sermon sources');
    expect(page.body.join(' ')).not.toMatch(/In Logos lists your archives\./);
  });

  it('the tutor’s instructions name the one place, and nowhere name Library > Sermons', () => {
    const dir = join(root, 'grinds/bible-talk.instructions');
    const text = readdirSync(dir).map((file) => readFileSync(join(dir, file), 'utf8')).join('\n');
    expect(text).toContain('Settings > Study resources > Sermons > Sermon sources');
    expect(text).not.toMatch(/Library > Sermons/);
  });

  it('no source file still sends him to Library > Sermons to switch a sermon source', () => {
    const files = ['src/library/kinds.ts', 'src/help.ts', 'src/settings/rows.ts', 'src/settings/definitions/sermons.ts', 'src/sermons/SermonsSheet.tsx', 'src/library/LibraryScreen.tsx', 'src/library/ImportLibrary.tsx'];
    for (const file of files) expect(readFileSync(join(root, file), 'utf8'), file).not.toMatch(/Library > Sermons(?! \(the old)/);
  });
});
