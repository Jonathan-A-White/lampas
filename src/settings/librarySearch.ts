// src/settings/librarySearch.ts — the library as a source of the Settings search (mw-rfjjzd.5, docs/design/library-at-scale.md 8): a title typed in the search answers the books of the catalogue that
// hold it, each opening its kind page at the book. Pure: SettingsScreen hands the query here and Found (SettingsHome.tsx) draws the answer.
import { CATALOGUE, type CatalogueEntry } from '../resources/catalogue';
import { matching, type ListItem } from '../ui/listFilter';

/** The most books the search shows at once; the line under them says when more match. */
export const MAX_BOOKS_FOUND = 5;

const ITEMS: readonly ListItem[] = CATALOGUE.map((e) => ({ id: e.resource, name: e.short, also: [e.title, e.author, e.series].filter(Boolean).join(' ') }));
const byResource = new Map(CATALOGUE.map((e) => [e.resource, e]));

/** The books whose short name, title, author or series holds `query` (the names that start with it first), at most MAX_BOOKS_FOUND, and how many match in all. */
export function searchLibrary(query: string): { books: CatalogueEntry[]; total: number } {
  const q = query.trim().toLocaleLowerCase();
  if (q === '') return { books: [], total: 0 };
  const found = matching(ITEMS, q);
  const rank = (item: ListItem): number => (item.name.toLocaleLowerCase().startsWith(q) ? 0 : item.name.toLocaleLowerCase().includes(q) ? 1 : 2);
  const ordered = found.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i);
  return {
    books: ordered.slice(0, MAX_BOOKS_FOUND).map(({ item }) => byResource.get(item.id)!),
    total: found.length,
  };
}
