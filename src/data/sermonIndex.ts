// src/data/sermonIndex.ts — public/sermons/index.json held in the bundle: the free sermon index's sources (licence, credit, counts, the books each lists, a fingerprint) and
// the shape of a book's file (public/sermons/<source>/<book>.json), both written by `npm run sermons:build` (scripts/sermons-build.ts; docs/sermons.md). Held in the bundle, as
// bookIndex.ts holds public/data/index.json, for what must answer at once and offline-proof: the offline copy's list of files (offlineCopy.ts) and, later, the Sermons door.
// The book files are not in the bundle and not in the precache: they are fetched on first use, as /sermons/<source>/<book>.json?v=<fingerprint>, and kept by the worker (dataCache.ts).
import index from '../../public/sermons/index.json' with { type: 'json' };

/** Where in a book a sermon's preaching text stands, in Lampas's book codes (src/data/canon.ts) and numbering. `toChapter` is left out when the text stays in `chapter`. */
export interface SermonRef {
  book: string;
  chapter: number;
  from: number;
  /** the last verse, in `toChapter` when that is given */
  to: number;
  toChapter?: number;
}

/** One sermon as a book's file lists it. `role` is 'text' (the preaching text); a cited reference will be 'cited', below it (not built yet). Optional keys are left out when the source has no value. */
export interface SermonRow {
  id: string;
  title: string;
  ref: SermonRef;
  role: 'text';
  url: string;
  /** a second form of the sermon (a pdf) */
  alt?: string;
  preacher?: string;
  /** when it was preached, ISO 8601 at the precision the source knows */
  date?: string;
}

/** public/sermons/<source>/<book>.json */
export interface SermonBookFile {
  rows: SermonRow[];
}

export interface SermonSource {
  id: string;
  name: string;
  kind: string;
  /** the terms, quoted from the source's own page */
  licence: string;
  credit: string;
  homepage: string;
  /** the sermons listed by a passage (a row with no preaching text is not counted) */
  rows: number;
  /** the books with a file, in canon order */
  books: string[];
  /** the first 12 hex of a SHA-256 over the source's book files: a file is asked for as ?v=<fingerprint>, so a changed source is fetched again */
  fingerprint: string;
}

export interface SermonIndex {
  sources: SermonSource[];
}

export const SERMON_INDEX: SermonIndex = index as SermonIndex;

/** The address of a source's book file: /sermons/<source>/<book>.json?v=<fingerprint>; plain when `from` has no such source. */
export function sermonBookUrl(source: string, book: string, from: SermonIndex = SERMON_INDEX): string {
  const fingerprint = from.sources.find((s) => s.id === source)?.fingerprint;
  return `/sermons/${source}/${book}.json${fingerprint ? `?v=${fingerprint}` : ''}`;
}
