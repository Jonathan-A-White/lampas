// tests/unit/source-list-archive-books.test.ts — a list made from Logos books stands for them and they have no row of their own (mw-qtu3zvz.181): so the list's row names each book it stands for with its author,
// and a search for the preacher finds the list.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';
import { SERMON_BOOKS } from '../../src/sermons/sources/logos';
import { sourceList, type SourceInput } from '../../src/sermons/sourceList';
import type { SermonSource } from '../../src/sermons/types';
import { EVERY_BOOK, EVERY_LOGOS_SERMON } from '../support/logos-import';

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
// his import keeps the books Lampas does not open too, so the books of every list are in it (four of batch 4's are in no catalogue kind, mw-qtu3zvz.24)
const input = (owned: ReadonlySet<string> = new Set([...EVERY_BOOK, ...EVERY_LOGOS_SERMON])): SourceInput => ({
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

  // the five volumes of Chrysostom's homilies are 'commentary' in the catalogue, not sermon books (mw-qtu3zvz.108): his list stands for them but names none
  // and four of batch 4's books are in no kind of the catalogue (mw-qtu3zvz.24): Burroughs's Rare Jewel (WRKSBURROUGHS01) and Difference between the Spots (07), Keach's Ax Laid to the Root (BPTSTCVNTTHLGYAX) and Kuyper's Rooted & Grounded
  const COMMENTARY = new Set(['LLS:6.60.10', 'LLS:6.60.11', 'LLS:6.60.12', 'LLS:6.60.13', 'LLS:6.60.14', 'LLS:WRKSBURROUGHS01', 'LLS:WRKSBURROUGHS07', 'LLS:BPTSTCVNTTHLGYAX', 'LLS:TEASELEXKUYPROOT']);

  it('every list names every sermon book it stands for, and the count is the 49 of logosSermonResources.ts, 40 of them sermon books', () => {
    const source = readFileSync('src/data/logosSermonResources.ts', 'utf8');
    expect(source.match(/'LLS:[^']+'/g)).toHaveLength(49);
    let named = 0;
    for (const id of ids) {
      const row = items.get(`sermons.${id}`)!;
      expect(row.books?.length ?? 0).toBe(LOGOS_RESOURCES[id].filter((resource) => !COMMENTARY.has(resource)).length);
      named += row.books?.length ?? 0;
      for (const b of row.books ?? []) expect(b.author, `${id}: ${b.title}`).toBeTruthy();
    }
    expect(named).toBe(40);
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
