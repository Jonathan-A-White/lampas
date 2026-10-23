// tests/unit/grammar-books-shelf.test.ts — the grammar books read the catalogue's grammar kind and the shelf's states (mw-rfjjzd.16, src/resources/grammarBooks.ts):
// a grammar with no sections table is never a book, and Read more puts the Pinned books before the On ones.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { setState, shelfOf } from '../../src/data/repositories';
import { entriesOf } from '../../src/resources/catalogue';
import { GRAMMAR_BOOKS, readMoreFor, shelvedBooks } from '../../src/resources/grammarBooks';
import { ASYNC_WAIT_MS } from '../support/timeouts';
import type { GrammarBook } from '../../src/resources/types';

const timeout = ASYNC_WAIT_MS;
const book = (id: string, ideas: string[] = ['noun']): GrammarBook => ({ id, lang: 'grc', short: id.toUpperCase(), name: id, resource: `LLS:${id.toUpperCase()}`, source: 'test', sections: [{ title: 'One', ref: 'Page.p_1', ideas }] });

describe('grammar books and the shelf', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear()]);
    // old keys that tick nothing, taken first: the shelf replaces the books those keys own (Black) the first time it takes them, and only then are the rows put
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
    await vi.waitFor(async () => expect(await db.library.get('#taken')).toBeDefined(), { timeout });
  });

  it("are the catalogue's grammars that have a sections table, in the catalogue's order, and no other", () => {
    const grammars = entriesOf('grammar');
    expect(grammars.some((e) => e.sections === undefined)).toBe(true);
    expect(GRAMMAR_BOOKS.map((b) => b.resource)).toEqual(grammars.filter((e) => e.sections !== undefined).map((e) => e.resource));
  });

  it("read the shelf's states: On and Pinned count as ticked, Pinned as pinned, a book with no row as Off, a row of a grammar that is no book as nothing", async () => {
    const [first] = GRAMMAR_BOOKS;
    const noTable = entriesOf('grammar').find((e) => e.sections === undefined)!;
    const books = [first, book('a'), book('b')];
    await db.library.bulkPut([
      { id: first.resource, kind: 'grammar', state: 'on', since: 1 },
      { id: 'LLS:A', kind: 'grammar', state: 'pinned', since: 1 },
      { id: noTable.resource, kind: 'grammar', state: 'pinned', since: 1 },
    ]);
    expect(shelvedBooks(books, await shelfOf('grammar'))).toEqual({ ticked: [first.id, 'a'], pinned: ['a'] });
  });

  it("reads the real shelf: setState to Pinned moves a book into pinned, and Off takes it out", async () => {
    const black = GRAMMAR_BOOKS.find((b) => b.id === 'black')!;
    await setState(black.resource, 'on');
    expect(shelvedBooks(GRAMMAR_BOOKS, await shelfOf('grammar'))).toEqual({ ticked: ['black'], pinned: [] });
    await setState(black.resource, 'pinned');
    expect(shelvedBooks(GRAMMAR_BOOKS, await shelfOf('grammar')).pinned).toEqual(['black']);
    await setState(black.resource, 'off');
    expect(shelvedBooks(GRAMMAR_BOOKS, await shelfOf('grammar'))).toEqual({ ticked: [], pinned: [] });
  });

  it('puts the Pinned books before the On ones, each group in the books’ order', () => {
    const books = ['a', 'b', 'c', 'd', 'e'].map((id) => book(id));
    const ticked = ['a', 'b', 'c', 'd', 'e'];
    expect(readMoreFor('noun', ticked, books).map((l) => l.book.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(readMoreFor('noun', ticked, books, undefined, ['d', 'b']).map((l) => l.book.id)).toEqual(['b', 'd', 'a', 'c', 'e']);
  });

  it('leaves out a Pinned book that does not teach the idea, and one that is Pinned but not ticked', () => {
    const books = [book('a'), book('b', ['verb']), book('c')];
    expect(readMoreFor('noun', ['a', 'b', 'c'], books, undefined, ['b']).map((l) => l.book.id)).toEqual(['a', 'c']);
    expect(readMoreFor('noun', ['a'], books, undefined, ['c']).map((l) => l.book.id)).toEqual(['a']);
  });
});
