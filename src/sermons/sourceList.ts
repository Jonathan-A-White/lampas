// src/sermons/sourceList.ts — the one list of sermon sources (mw-qtu3zvz.92, docs/design/sermon-sources.md): every source the Sermons door draws on, once, as the page Settings > Study resources > Sermons >
// Sermon sources lists it (SermonSourcesPage.tsx). A source is a passage list (its switch is the setting `sermons.<id>`) or a Logos book (its switch is its row of the shelf, Pinned read as On); a list made from
// Logos books stands for those books, which have no row of their own. A Logos source is listed only while Logos is On and his Library import holds it or Logos gives it free (src/library/owned.ts). Pure:
// useSourceList.ts reads the phone and hands it here.
import type { ShelfState } from '../data/repositories';
import { isFreeLogos, isOffered, type Owned } from '../library/owned';
import type { CatalogueEntry, Kind } from '../resources/catalogue';
import { sourceKey, sourceOffered } from './enabled';
import type { SermonSource } from './types';

/** The two groups of the list, named by what On gives: each sermon at its verse, or one link to the whole book at the verse. */
export type SourceGroup = 'listed' | 'books';

export const GROUP_ORDER: readonly SourceGroup[] = ['listed', 'books'];

/** A group's heading and the one line under it. */
export const GROUP_WORDS: Record<SourceGroup, { title: string; line: string }> = {
  listed: { title: 'Listed by passage', line: 'Each sermon is listed at its verse. The count on the Sermons door is these.' },
  books: { title: 'Logos books, at the verse', line: 'Logos opens the book at the verse you are reading. Lampas cannot say which sermons it holds there.' },
};

/** One row of the list. */
export interface SourceItem {
  /** a list: the key of its setting, 'sermons.<id>'; a book: its Logos Resource ID */
  id: string;
  sort: 'list' | 'book';
  group: SourceGroup;
  /** line 1: a list's name without the bracket at its end, a book's short name */
  name: string;
  /** the whole name: what a screen reader says and the search looks in */
  title: string;
  /** line 2: how many sermons and where they open, or a book's series and preacher */
  detail?: string;
  /** Logos gives it to every new user */
  free?: true;
  /** a book with more than sermons: the kind of the Library's page it is also on */
  also?: Kind;
  /** more words the search looks in: the preacher, the series, the titles of the books under a list, 'web' or 'Logos' */
  search: string;
  on: boolean;
  /** a book that is Pinned on its page of the Library: it reads as On here, and an Undo puts the pin back */
  pinned?: true;
}

export interface SourceInput {
  /** every passage list: the bundled ones, then those the sermon index service added */
  sources: readonly SermonSource[];
  /** every Logos book that can be a source (src/sermons/sources/logos.ts SERMON_BOOKS) */
  books: readonly CatalogueEntry[];
  /** how many sermons the index lists for a source; undefined where it does not say */
  sermonCount: (sourceId: string) => number | undefined;
  /** the Resource IDs of his Library import */
  owned: Owned;
  /** whether the Logos study resource is On */
  logosOn: boolean;
  /** a saved setting as text, undefined for one never saved */
  read: (key: string) => string | undefined;
  /** his shelf, by Resource ID */
  shelf: ReadonlyMap<string, ShelfState>;
}

export interface SourceList {
  items: SourceItem[];
  /** whether the Logos study resource is On */
  logosOn: boolean;
  /** the Logos sources his import holds (or Logos gives free), listed or not */
  held: number;
  /** the Logos sources his import holds that are not listed while Logos is off */
  hidden: number;
  /** how many of those are switched On */
  hiddenOn: number;
}

/** A list's name on its row: the source's name without a bracket at its end ('Spurgeon's sermons', not 'Spurgeon's sermons (CCEL)'); line 2 says where it opens. */
export const listName = (name: string): string => name.replace(/ \([^)]*\)$/, '');

/** Whether a list opens its sermons in Logos: it names its Logos books, or rides on the Logos study resource. */
const inLogos = (source: Pick<SermonSource, 'resources' | 'needs'>): boolean => source.resources !== undefined || source.needs === 'logos';

function listItem(source: SermonSource, input: SourceInput, titleOf: (resource: string) => string | undefined): SourceItem {
  const saved = input.read(sourceKey(source));
  const count = input.sermonCount(source.id);
  const where = inLogos(source) ? 'in Logos' : 'on the web';
  const free = (source.resources ?? []).some(isFreeLogos);
  return {
    id: sourceKey(source),
    sort: 'list',
    group: 'listed',
    name: listName(source.name),
    title: listName(source.name),
    detail: count === undefined ? where : `${count.toLocaleString('en')} ${count === 1 ? 'sermon' : 'sermons'} · ${where}`,
    ...(free ? { free: true as const } : {}),
    search: [source.name, source.by, source.credit, ...(source.resources ?? []).map(titleOf), inLogos(source) ? 'Logos' : 'web'].filter(Boolean).join(' '),
    on: (saved === 'on' || saved === 'off' ? saved : source.default) === 'on',
  };
}

/** What a book's second line says: its series and its preacher, where the catalogue knows them and the name does not already say them. */
function bookDetail(entry: CatalogueEntry): string | undefined {
  const said = entry.short.toLocaleLowerCase();
  const parts = [entry.series, entry.author].filter((part): part is string => part !== undefined && part !== '' && !said.includes(part.toLocaleLowerCase()));
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function bookItem(entry: CatalogueEntry, input: SourceInput): SourceItem {
  const detail = bookDetail(entry);
  return {
    id: entry.resource,
    sort: 'book',
    group: 'books',
    name: entry.short,
    title: entry.title,
    ...(detail ? { detail } : {}),
    ...(isFreeLogos(entry.resource) ? { free: true as const } : {}),
    ...(entry.kind === 'sermons' ? {} : { also: entry.kind }),
    search: [entry.title, entry.series, entry.author, 'Logos'].filter(Boolean).join(' '),
    on: (input.shelf.get(entry.resource) ?? 'off') !== 'off',
    ...(input.shelf.get(entry.resource) === 'pinned' ? { pinned: true as const } : {}),
  };
}

/** The list for a reader: the passage lists in the order given, then the Logos books in the catalogue's order (inOrder files them for the page). */
export function sourceList(input: SourceInput): SourceList {
  const titles = new Map(input.books.map((entry) => [entry.resource, entry.title]));
  const lists = input.sources.map((source) => ({ source, item: listItem(source, input, (resource) => titles.get(resource)) }));
  const under = new Set(input.sources.flatMap((source) => source.resources ?? []));
  const books = input.books.filter((entry) => !under.has(entry.resource) && isOffered(entry.resource, input.owned)).map((entry) => bookItem(entry, input));
  // a list that opens in Logos is listed while Logos is On and, where it names its Logos books, his import holds one of them
  const shown = lists.filter(({ source }) => !inLogos(source) || (input.logosOn && sourceOffered(source, input.owned))).map(({ item }) => item);
  // what his import holds: while Logos is off these are hidden, and a reader with no Logos is told nothing of it
  const held = [...lists.filter(({ source }) => source.resources !== undefined && sourceOffered(source, input.owned)).map(({ item }) => item), ...books];
  if (input.logosOn) return { items: [...shown, ...books], logosOn: true, held: held.length, hidden: 0, hiddenOn: 0 };
  return { items: shown, logosOn: false, held: held.length, hidden: held.length, hiddenOn: held.filter((item) => item.on).length };
}

/** A name as a library files it: a leading A, An or The is passed over ('The Beatitudes' is under B). */
export const filingName = (name: string): string => name.replace(/^(a|an|the)\s+/i, '');

/** The order of the page: the groups in order, in each what is on and then the rest, each by name with a number read as a number (so the volumes of a series stand together, 'Volume 2' before 'Volume 10'). */
export function inOrder(items: readonly SourceItem[]): SourceItem[] {
  const byName = (a: SourceItem, b: SourceItem): number => filingName(a.name).localeCompare(filingName(b.name), 'en', { numeric: true, sensitivity: 'base' });
  return GROUP_ORDER.flatMap((group) => {
    const own = items.filter((item) => item.group === group);
    return [...own.filter((item) => item.on).sort(byName), ...own.filter((item) => !item.on).sort(byName)];
  });
}

/** How many of a set are on: '17 of 120 on', 'none of 120 on'. */
export const countLine = (on: number, total: number): string => `${on === 0 ? 'none' : on} of ${total} on`;

/** The count in the page's header: '17 on', 'none on'. */
export const onLine = (on: number): string => (on === 0 ? 'none on' : `${on} on`);

/** How many items are on. */
export const onCount = (items: readonly SourceItem[]): number => items.filter((item) => item.on).length;
