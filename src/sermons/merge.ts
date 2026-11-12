// src/sermons/merge.ts — the bundled sermons of a place and the sermon index service's, as one list (docs/sermons.md 'When online'). Pure: the service's rows are made into the module's own SermonRow
// (the OSIS reference read into Lampas's books and numbering, src/sermons/osis.ts), and a row of the same source and id is replaced by the service's (its newer title or address wins); rows the bundle lacks are added,
// under their groups; a row of a source that is Off is left out, and so is a row that merely cites the passage (the bundle lists preaching texts only).
import { CANON_INDEX } from '../data/bookIndex';
import { parseOsisRef, type VerseCounts } from './osis';
import { groupAnswers, touches } from './sermonsFor';
import type { ServiceHit, ServiceSermon, ServiceThemeSermon } from '../services/sermons';
import type { SermonPlace, SermonRow, SermonsFound, ThemeRow } from './types';

/** The verse counts of Lampas's chapters, from the bundled index. */
export const canonVerses: VerseCounts = (code) => CANON_INDEX.books.find((book) => book.code === code)?.verses;

/** A ref.ly address is a link into his Logos library (as the bundled sources read it). */
const opensInLogos = (url: string): boolean => /^https:\/\/ref\.ly\//.test(url);

/** The service's addresses are https pages; anything else (a script, a file) is never made a link. */
const isWeb = (url: string): boolean => /^https:\/\//.test(url);

/** Whether a host name is Subsplash's: subsplash.com or subspla.sh, or a subdomain of either. The one rule for it (subsplashAlt and openWeb.ts isVideoAddress both read it). */
export function isSubsplashHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ['subsplash.com', 'subspla.sh'].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** The alternate address when it is a Subsplash one (https on subsplash.com or subspla.sh, or a subdomain of either: the church's short links are brookfieldfirst.subspla.sh/…), else undefined. Subsplash is already trimmed to the sermon, so it is preferred to the row's url (mw-qtu3zvz.49.2). */
export function subsplashAlt(alt: string | undefined): string | undefined {
  if (alt === undefined) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(alt);
  } catch {
    return undefined;
  }
  return parsed.protocol === 'https:' && isSubsplashHost(parsed.hostname) ? alt : undefined;
}

/** The row as the sheet opens it: a Subsplash alternate address opens in place of the url (as a web page, whatever the url was); every other row is as it is. */
export function openedRow<T extends Pick<SermonRow, 'open' | 'opensIn' | 'alt'>>(row: T): T {
  const subsplash = subsplashAlt(row.alt);
  return subsplash === undefined ? row : { ...row, open: { url: subsplash }, opensIn: 'web' };
}

/** The module's row for one of the service's, or undefined when its reference is none Lampas can hold in the place's book (a book it lacks, a verse past the end). */
export function rowOfService(row: ServiceSermon, book: string, verses: VerseCounts = canonVerses): SermonRow | undefined {
  if (!isWeb(row.url)) return undefined;
  const parsed = parseOsisRef(row.ref, verses);
  if (!parsed.ok) return undefined;
  const ref = parsed.parts.find((part) => part.book === book);
  if (!ref) return undefined;
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    ...(row.preacher === null || row.preacher === '' ? {} : { preacher: row.preacher }),
    ...(row.date === null || row.date === '' ? {} : { date: row.date }),
    ref,
    role: 'text',
    open: { url: row.url },
    opensIn: opensInLogos(row.url) ? 'logos' : 'web',
    ...(row.alt_url ? { alt: row.alt_url } : {}),
  };
}

/**
 * The row of a sermon the service marks as linked from its notes to a topic (mw-qtu3zvz.59.2): the sermon whole, whatever its book. Its preaching text is the first part of `ref` in Lampas's books, and absent where the service
 * gives none (null: most of Brookfield First's) or none Lampas can read; the row then says only that it came from the notes. Undefined where the address is no https page.
 */
export function directRowOfService(row: ServiceThemeSermon, verses: VerseCounts = canonVerses): ThemeRow | undefined {
  if (!isWeb(row.url)) return undefined;
  const parsed = row.ref === null ? undefined : parseOsisRef(row.ref, verses);
  const ref = parsed?.ok ? parsed.parts[0] : undefined;
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    ...(row.preacher === null || row.preacher === '' ? {} : { preacher: row.preacher }),
    ...(row.date === null || row.date === '' ? {} : { date: row.date }),
    ...(ref ? { ref, role: 'text' as const } : {}),
    open: { url: row.url },
    opensIn: opensInLogos(row.url) ? 'logos' : 'web',
    ...(row.alt_url ? { alt: row.alt_url } : {}),
    notes: true,
  };
}

/** What a row of the sheet draws: a sermon's title, the preacher and date where known, and where it opens. The search's rows have no passage to hold, so they are only this. */
export type LinkRow = Pick<SermonRow, 'id' | 'source' | 'title' | 'preacher' | 'date' | 'open' | 'opensIn' | 'alt'>;

/** The row of a sermon the service gave, with no passage read. */
export const linkRowOf = (row: Pick<ServiceSermon, 'source' | 'id' | 'title' | 'url'> & Partial<Pick<ServiceSermon, 'preacher' | 'date' | 'alt_url'>>): LinkRow | undefined =>
  !isWeb(row.url)
    ? undefined
    : {
        id: row.id,
        source: row.source,
        title: row.title,
        ...(row.preacher ? { preacher: row.preacher } : {}),
        ...(row.date ? { date: row.date } : {}),
        open: { url: row.url },
        opensIn: opensInLogos(row.url) ? 'logos' : 'web',
        ...(row.alt_url ? { alt: row.alt_url } : {}),
      };

/** The row of a search hit that is a sermon (it has an address); a theme has none. */
export const linkRowOfHit = (hit: ServiceHit): LinkRow | undefined =>
  hit.kind === 'sermon' && hit.url
    ? linkRowOf({
        source: hit.source,
        id: hit.id,
        title: hit.title,
        url: hit.url,
      })
    : undefined;

export interface Merged {
  found: SermonsFound;
  /** how many rows the service gave that the bundle lacks */
  added: number;
}

export interface MergeOptions {
  place: SermonPlace;
  /** the ids of the sources in use, in the registry's order: the bundled ones that are On, then the service's own that are On. A service row of any other source is left out. */
  sources: readonly string[];
  verses?: VerseCounts;
}

const startOf = (row: SermonRow): number => row.ref.chapter * 1000 + row.ref.from;
const keyOf = (row: Pick<SermonRow, 'source' | 'id'>): string => `${row.source}\u0000${row.id}`;

/** The bundled `found` with the service's `rows` merged in; `found` itself is not changed. */
export function mergeServiceRows(found: SermonsFound, rows: readonly ServiceSermon[], options: MergeOptions): Merged {
  const { place, sources } = options;
  const verses = options.verses ?? canonVerses;
  const bundled = [...found.here, ...found.chapter];
  const bySource = new Map<string, SermonRow[]>(sources.map((id) => [id, []]));
  for (const row of bundled) {
    const list = bySource.get(row.source);
    if (list) list.push(row);
    else bySource.set(row.source, [row]);
  }
  const held = new Map(bundled.map((row) => [keyOf(row), row]));
  let added = 0;
  const seen = new Set<string>();
  for (const sermon of rows) {
    if (sermon.role !== 'text' || !sources.includes(sermon.source)) continue;
    const row = rowOfService(sermon, place.book, verses);
    if (!row || !touches(row.ref, place.chapter)) continue;
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const list = bySource.get(row.source)!;
    const was = held.get(key);
    if (was) list[list.indexOf(was)] = row;
    else {
      list.push(row);
      added++;
    }
  }
  // each source's rows in verse order again (a stable sort: the bundled order stays where the starts are equal)
  const answers = [...bySource.values()].map((list) => [...list].sort((a, b) => startOf(a) - startOf(b)));
  return { found: groupAnswers(answers, place), added };
}
