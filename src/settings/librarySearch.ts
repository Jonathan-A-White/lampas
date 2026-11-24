// src/settings/librarySearch.ts — the library as a source of the Settings search (mw-rfjjzd.5, docs/design/library-at-scale.md 8): a title typed in the search answers the books of the catalogue that
// hold it, each opening its kind page at the book. A book that is only sermons is on no page of the Library (mw-qtu3zvz.92): it is answered only when it is in the one list of sermon sources (`sermonBooks`,
// the Resource IDs listed there), and opens that list at its row. Pure: useListMatches hands the query here and Found (SettingsHome.tsx) draws the number as ONE row that opens the Library filtered to it (mw-qtu3zvz.281): `total` is the number of books the Library's own search then lists.
import { offeredEntries, type Owned } from '../data/owned';
import { CATALOGUE, type CatalogueEntry } from '../resources/catalogue';
import { matching, type ListItem } from '../ui/listFilter';

/** The most books the search shows at once; the line under them says when more match. */
export const MAX_BOOKS_FOUND = 5;

const item = (e: CatalogueEntry): ListItem => ({ id: e.resource, name: e.short, also: [e.title, e.author, e.series].filter(Boolean).join(' ') });
const byResource = new Map(CATALOGUE.map((e) => [e.resource, e]));

/** The books whose short name, title, author or series holds `query` (the names that start with it first), at most MAX_BOOKS_FOUND, and how many match in all. Only a book of `owned` (his import, or free
 *  with Logos: src/data/owned.ts offeredEntries, mw-qtu3zvz.167) is answered: the Library page the answer opens does not list another. */
export function searchLibrary(query: string, owned: Owned, sermonBooks: ReadonlySet<string> = new Set()): { books: CatalogueEntry[]; total: number } {
  const q = query.trim().toLocaleLowerCase();
  if (q === '') return { books: [], total: 0 };
  const found = matching(offeredEntries(CATALOGUE, owned).filter((e) => e.kind !== 'sermons' || sermonBooks.has(e.resource)).map(item), q);
  const rank = (item: ListItem): number => (item.name.toLocaleLowerCase().startsWith(q) ? 0 : item.name.toLocaleLowerCase().includes(q) ? 1 : 2);
  const ordered = found.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i);
  return {
    books: ordered.slice(0, MAX_BOOKS_FOUND).map(({ item }) => byResource.get(item.id)!),
    total: found.length,
  };
}
