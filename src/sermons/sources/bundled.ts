// src/sermons/sources/bundled.ts — the sermon sources bundled with the app (docs/sermons.md): one SermonSource for each source of public/sermons/index.json (src/data/sermonIndex.ts). A source reads a book's
// file (public/sermons/<source>/<book>.json) the first time a place in that book is asked, once, by the fingerprinted address the worker keeps (sermonBookUrl, src/dataCache.ts), and gives the rows that touch the chapter.
// Nothing of a sermon but its facts is held; the page where it is read is only linked.
import { SERMON_INDEX, sermonBookUrl, type SermonBookFile, type SermonRow as FileRow, type SermonSource as IndexSource } from '../../data/sermonIndex';
import { touches } from '../sermonsFor';
import type { SermonPlace, SermonRow, SermonSource } from '../types';

const files = new Map<string, Promise<SermonRow[]>>();

/** Forgets the files read (a test starts over). */
export const forgetSermonFiles = (): void => files.clear();

/** A ref.ly address is a link into his Logos library: the app opens the sermon there, for an owner of the archive. */
const opensInLogos = (url: string): boolean => /^https:\/\/ref\.ly\//.test(url);

/** The Logos Resource IDs each bundled Logos source opens its sermons in (the ref.ly address of its rows; tests/unit/sermons-owned.test.ts holds this equal to the book files). */
export const LOGOS_RESOURCES: Readonly<Record<string, readonly string[]>> = {
  'greg-laurie-logos': ['LLS:GRGLRSRMNRCH'],
  'jd-greear-logos': ['LLS:JDGRRSRMNRCHV'],
  'skip-heitzig-logos': ['LLS:SKPHTZGSRMN'],
  'spurgeon-sermon-notes-logos': ['LLS:MYSRMNOTES01', 'LLS:MYSRMNOTES03'],
  'wesley-logos': ['LLS:36.0.11', 'LLS:WORKSWESLEY05', 'LLS:WORKSWESLEY06', 'LLS:WORKSWESLEY07'],
  'whitefield-logos': ['LLS:36.0.12'],
  'moody-logos': ['LLS:MENBBLMOODY', 'LLS:OVRCMNGLFMOODY', 'LLS:WAYGODMOODY', 'LLS:12SELSERMMOODY'],
};

const rowOf = (source: string, row: FileRow): SermonRow => ({
  id: row.id,
  source,
  title: row.title,
  ...(row.preacher === undefined ? {} : { preacher: row.preacher }),
  ...(row.date === undefined ? {} : { date: row.date }),
  ref: row.ref,
  role: row.role,
  open: { url: row.url },
  opensIn: opensInLogos(row.url) ? 'logos' : 'web',
  ...(row.alt === undefined || row.alt === '' ? {} : { alt: row.alt }),
});

async function readBook(source: string, book: string): Promise<SermonRow[]> {
  const response = await fetch(sermonBookUrl(source, book));
  if (!response.ok) throw new Error(`could not read the sermons of ${source} in ${book}: ${response.status}`);
  const file = (await response.json()) as SermonBookFile;
  return file.rows.map((row) => rowOf(source, row));
}

/** A book's rows, read once; a file that failed is asked for again next time. */
function bookRows(source: string, book: string): Promise<SermonRow[]> {
  const key = `${source}/${book}`;
  let read = files.get(key);
  if (!read) {
    read = readBook(source, book);
    files.set(key, read);
    read.catch(() => files.delete(key));
  }
  return read;
}

function sourceOf(entry: IndexSource): SermonSource {
  return {
    id: entry.id,
    name: entry.name,
    homepage: entry.homepage,
    credit: entry.credit,
    // one short line: the Settings row's hint, and a line of what the tutor is told (the credit is on the sheet)
    describe: `Listed by passage${/logos\.com/.test(entry.homepage) ? '; opens in Logos' : ''}.`,
    default: entry.onByDefault === false ? 'off' : 'on',
    ...(LOGOS_RESOURCES[entry.id] ? { resources: LOGOS_RESOURCES[entry.id] } : {}),
    async sermonsFor(place: SermonPlace): Promise<SermonRow[]> {
      // a book the source has no file for is no request
      if (!entry.books.includes(place.book)) return [];
      return (await bookRows(entry.id, place.book)).filter((row) => touches(row.ref, place.chapter));
    },
    async sermonsInBook(book: string): Promise<SermonRow[]> {
      return entry.books.includes(book) ? bookRows(entry.id, book) : [];
    },
  };
}

/** One source for each source of the index, in the index's order. */
export const bundledSources = (): SermonSource[] => SERMON_INDEX.sources.map(sourceOf);
