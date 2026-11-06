// src/sermons/sources/bundled.ts — the sermon sources bundled with the app (docs/sermons.md): one SermonSource for each source of public/sermons/index.json (src/data/sermonIndex.ts). A source reads a book's
// file (public/sermons/<source>/<book>.json) the first time a place in that book is asked, once, by the fingerprinted address the worker keeps (sermonBookUrl, src/dataCache.ts), and gives the rows that touch the chapter.
// Nothing of a sermon but its facts is held; the page where it is read is only linked.
import { SERMON_INDEX, sermonBookUrl, type SermonBookFile, type SermonRow as FileRow, type SermonSource as IndexSource } from '../../data/sermonIndex';
import { touches } from '../sermonsFor';
import type { SermonPlace, SermonRow, SermonSource } from '../types';

const files = new Map<string, Promise<SermonRow[]>>();

/** Forgets the files read (a test starts over). */
export const forgetSermonFiles = (): void => files.clear();

const rowOf = (source: string, row: FileRow): SermonRow => ({
  id: row.id,
  source,
  title: row.title,
  ...(row.preacher === undefined ? {} : { preacher: row.preacher }),
  ...(row.date === undefined ? {} : { date: row.date }),
  ref: row.ref,
  role: row.role,
  open: { url: row.url },
  opensIn: 'web',
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
    describe: `${entry.rows.toLocaleString('en-US')} sermons listed by the passage each was preached on, each read on its own page at ${entry.credit}.`,
    default: 'on',
    async sermonsFor(place: SermonPlace): Promise<SermonRow[]> {
      // a book the source has no file for is no request
      if (!entry.books.includes(place.book)) return [];
      return (await bookRows(entry.id, place.book)).filter((row) => touches(row.ref, place.chapter));
    },
  };
}

/** One source for each source of the index, in the index's order. */
export const bundledSources = (): SermonSource[] => SERMON_INDEX.sources.map(sourceOf);
