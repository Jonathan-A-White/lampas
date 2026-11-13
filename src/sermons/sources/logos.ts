// src/sermons/sources/logos.ts — his Logos sermon books as the 'In Logos' group of the Sermons sheet (mw-qtu3zvz.3, docs/sermons.md 'In Logos'). The catalogue's kind `sermons` (types text.monograph.sermons and
// text.monograph.sermon-outlines, src/resources/catalogue/sermons.json) holds each book by its Resource ID, and a book of another kind that also holds sermons carries the mark `alsoSermons` (mw-qtu3zvz.92,
// docs/design/sermon-sources.md section 11). The ones that are On in the one list of sermon sources are one link each, opened at the verse, the passage's first verse or the chapter; a book a passage list stands
// for has none, since each of its sermons is already a link into it. This is not a SermonSource: Logos does not say which sermons of a book preach the passage (docs/sources/sermon-index.md section 2), so no row
// of it is counted by the door. It draws nothing itself and fetches nothing: every link is UNVERIFIED on a device until he taps it (docs/resources.md, mw-5r3p30.1072).
import type { ShelfState } from '../../data/repositories';
import { sermonBookRows } from '../../library/inLogos';
import type { Owned } from '../../library/owned';
import { CATALOGUE, entriesOf, type CatalogueEntry } from '../../resources/catalogue';
import type { SermonPlace, SermonSource } from '../types';
import { LOGOS_RESOURCES } from './bundled';

/** Every book the one list can hold: the sermon books, then the books of another kind that also hold sermons. */
export const SERMON_BOOKS: readonly CatalogueEntry[] = [...entriesOf('sermons'), ...CATALOGUE.filter((entry) => entry.kind !== 'sermons' && entry.alsoSermons)];

/** The Resource IDs a passage list stands for: such a book has no row of its own and no In Logos link. The bundled lists' by default; `sources` adds those of the lists given. */
export const underLists = (sources: readonly Pick<SermonSource, 'resources'>[] = []): ReadonlySet<string> => new Set([...Object.values(LOGOS_RESOURCES).flat(), ...sources.flatMap((source) => source.resources ?? [])]);

/** One sermon book of his shelf, as the sheet draws it: a link into Logos at the place. */
export interface ArchiveRow {
  /** the Logos Resource ID, unique */
  id: string;
  entry: CatalogueEntry;
  state: Exclude<ShelfState, 'off'>;
  title: string;
  /** `logosres:<id>;ref=Bible.Ro5.8` with its ref.ly fallback (armFallback) */
  open: { url: string; fallback: string };
  opensIn: 'logos';
}

/** A name as a library files it: lower case, a leading A, An or The passed over. */
const filed = (name: string): string => name.replace(/^(a|an|the)\s+/i, '');

/**
 * The sermon books that are On in `shelf` (by Resource ID; a book once Pinned reads as On) and, given `owned`, in his import or free (src/library/owned.ts), at the place, by name. A book a passage list stands for
 * (`under`) is left out. A passage opens at its first verse, a chapter at the chapter; a book with more than sermons is offered only at the verses it covers. Pure; `entries` is a test's own.
 */
export function logosArchives(place: SermonPlace, shelf: ReadonlyMap<string, ShelfState>, entries: readonly CatalogueEntry[] = SERMON_BOOKS, owned?: Owned, under: ReadonlySet<string> = underLists()): ArchiveRow[] {
  return sermonBookRows(entries.filter((entry) => !under.has(entry.resource)), shelf, { book: place.book, chapter: place.chapter, ...(place.from === undefined ? {} : { verse: place.from }) }, owned)
    .map((row): ArchiveRow => ({ id: row.entry.resource, entry: row.entry, state: row.state, title: row.entry.title, open: { url: row.link.url, fallback: row.link.fallback }, opensIn: 'logos' }))
    .sort((a, b) => filed(a.entry.short).localeCompare(filed(b.entry.short), 'en', { numeric: true, sensitivity: 'base' }));
}
