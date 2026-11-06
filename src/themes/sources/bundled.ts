// src/themes/sources/bundled.ts — the theme sources bundled with the app (docs/sermons.md 'The themes'): one ThemeSource for each source of public/themes/index.json (src/data/themeIndex.ts). A source reads a book's
// file (public/themes/<source>/<book>.json) the first time that book is asked, once, by the fingerprinted address the worker keeps (themeBookUrl, src/dataCache.ts). Nothing of a book but the topics' names, their
// part labels and the passages is held.
import { parseLinkRef, THEME_INDEX, themeBookUrl, type ThemeBookFile, type ThemeSourceEntry } from '../../data/themeIndex';
import type { Link, ThemeBook, ThemeSource } from '../types';

const files = new Map<string, Promise<ThemeBook>>();

/** Forgets the files read (a test starts over). */
export const forgetThemeFiles = (): void => files.clear();

/** A book file as the module reads it: each link's `ref` text made a SermonRef of the file's book. */
export function bookOf(book: string, file: ThemeBookFile): ThemeBook {
  const links: Link[] = [];
  for (const link of file.links) {
    const ref = parseLinkRef(link.ref);
    if (ref) links.push({ topic: link.topic, ...(link.part === undefined ? {} : { part: link.part }), ref: { book, ...ref } });
  }
  return { topics: file.topics, links };
}

async function readBook(source: string, book: string): Promise<ThemeBook> {
  const response = await fetch(themeBookUrl(source, book));
  if (!response.ok) throw new Error(`could not read the themes of ${source} in ${book}: ${response.status}`);
  return bookOf(book, (await response.json()) as ThemeBookFile);
}

/** A book's topics and links, read once; a file that failed is asked for again next time. */
function bookThemes(source: string, book: string): Promise<ThemeBook> {
  const key = `${source}/${book}`;
  let read = files.get(key);
  if (!read) {
    read = readBook(source, book);
    files.set(key, read);
    read.catch(() => files.delete(key));
  }
  return read;
}

function sourceOf(entry: ThemeSourceEntry): ThemeSource {
  return {
    id: entry.id,
    name: entry.name,
    homepage: entry.homepage,
    credit: entry.credit,
    describe: `Topics of a verse, from ${entry.topics.toLocaleString('en-US')}.`,
    default: 'on',
    async book(book: string): Promise<ThemeBook> {
      // a book the source has no file for is no request
      return entry.books.includes(book) ? bookThemes(entry.id, book) : { topics: [], links: [] };
    },
  };
}

/** One source for each source of the index, in the index's order. */
export const bundledSources = (): ThemeSource[] => THEME_INDEX.sources.map(sourceOf);
