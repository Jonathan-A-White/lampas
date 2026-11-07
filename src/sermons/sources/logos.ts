// src/sermons/sources/logos.ts — his Logos sermon archives as the 'In Logos' group of the Sermons sheet (mw-qtu3zvz.3, docs/sermons.md 'In Logos'). The catalogue's kind `sermons` (types text.monograph.sermons and
// text.monograph.sermon-outlines, src/resources/catalogue/sermons.json) holds each archive by its Resource ID; the ones he has On or Pinned on his shelf are one link each, opened at the verse, the passage's first verse
// or the chapter. This is not a SermonSource: Logos does not say which sermons of an archive preach the passage (docs/sources/sermon-index.md section 2), so no row of it is counted by the door. It draws nothing itself and
// fetches nothing: every link is UNVERIFIED on a device until he taps it (docs/resources.md, mw-5r3p30.1072).
import type { ShelfState } from '../../data/repositories';
import { inLogosRows } from '../../library/inLogos';
import { entriesOf, type CatalogueEntry } from '../../resources/catalogue';
import type { SermonPlace } from '../types';

/** One archive of his shelf, as the sheet draws it: a link into Logos at the place. */
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

/**
 * The archives that are On or Pinned in `shelf` (by Resource ID) at the place, the Pinned first and each state in the catalogue's order. A passage opens at its first verse, a chapter at the chapter. Pure; `entries` is a
 * test's own.
 */
export function logosArchives(place: SermonPlace, shelf: ReadonlyMap<string, ShelfState>, entries: readonly CatalogueEntry[] = entriesOf('sermons')): ArchiveRow[] {
  const rows = inLogosRows(entries, shelf, { book: place.book, chapter: place.chapter, ...(place.from === undefined ? {} : { verse: place.from }) }).map(
    (row): ArchiveRow => ({ id: row.entry.resource, entry: row.entry, state: row.state, title: row.entry.title, open: { url: row.link.url, fallback: row.link.fallback }, opensIn: 'logos' }),
  );
  return [...rows.filter((r) => r.state === 'pinned'), ...rows.filter((r) => r.state !== 'pinned')];
}
