// tests/unit/source-list-archive-books.test.ts — a list made from Logos books stands for them and they have no row of their own (mw-qtu3zvz.181): so the list's row names each book it stands for with its author,
// and a search for the preacher finds the list.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';
import { SERMON_BOOKS } from '../../src/sermons/sources/logos';
import { sourceList, type SourceInput } from '../../src/sermons/sourceList';
import type { SermonSource } from '../../src/sermons/types';
import { EVERY_BOOK } from '../support/logos-import';

const list = (id: string, name: string): SermonSource => ({
  id,
  name,
  homepage: `https://${id}.test`,
  credit: name,
  describe: 'Listed by passage.',
  default: 'off',
  sermonsFor: async () => [],
  resources: LOGOS_RESOURCES[id],
});

const ids = Object.keys(LOGOS_RESOURCES);
const input = (owned: ReadonlySet<string> = EVERY_BOOK): SourceInput => ({
  sources: ids.map((id) => list(id, `${id} (Logos library)`)),
  books: SERMON_BOOKS,
  sermonCount: () => undefined,
  owned,
  logosOn: true,
  read: () => undefined,
  shelf: new Map(),
});

describe('a list made from Logos books names them, with their authors', () => {
  const items = new Map(sourceList(input()).items.map((item) => [item.id, item]));

  it("the row of 'wesley-logos' names each of its four books and John Wesley", () => {
    const row = items.get('sermons.wesley-logos')!;
    expect(row.books?.map((b) => b.title)).toEqual(
      expect.arrayContaining(['Sermons, on Several Occasions', 'The Works of John Wesley, Volume 5', 'The Works of John Wesley, Volume 6', 'The Works of John Wesley, Volume 7']),
    );
    expect(row.books).toHaveLength(4);
    expect(row.books?.every((b) => b.author === 'John Wesley')).toBe(true);
  });

  it("the row of 'moody-logos' names each of its four books and D. L. Moody", () => {
    const row = items.get('sermons.moody-logos')!;
    expect(row.books).toHaveLength(4);
    expect(row.books?.every((b) => b.author === 'D. L. Moody')).toBe(true);
    expect(row.books?.map((b) => b.title)).toContain('The Way to God and How to Find It');
  });

  it('every list names every book it stands for, and the count is the 14 of logosSermonResources.ts', () => {
    const source = readFileSync('src/data/logosSermonResources.ts', 'utf8');
    expect(source.match(/'LLS:[^']+'/g)).toHaveLength(14);
    let named = 0;
    for (const id of ids) {
      const row = items.get(`sermons.${id}`)!;
      expect(row.books?.length).toBe(LOGOS_RESOURCES[id].length);
      named += row.books?.length ?? 0;
      for (const b of row.books ?? []) expect(b.author, `${id}: ${b.title}`).toBeTruthy();
    }
    expect(named).toBe(14);
  });

  it("a search for the preacher finds the list through its books' author", () => {
    expect(items.get('sermons.moody-logos')!.search).toContain('D. L. Moody');
    expect(items.get('sermons.wesley-logos')!.search).toContain('John Wesley');
  });

  it('names only the books his import holds', () => {
    const one = new Map(sourceList(input(new Set(['LLS:36.0.11']))).items.map((item) => [item.id, item]));
    expect(one.get('sermons.wesley-logos')!.books?.map((b) => b.title)).toEqual(['Sermons, on Several Occasions']);
  });
});
