// scripts/places-build.ts — npm run places:build
// Cuts STEPBible's TIPNR (Tyndale House Cambridge and STEPBible.org, CC BY 4.0, https://github.com/STEPBible/STEPBible-Data; coordinates from OpenBible.info; docs/maps.md)
// into one file per book, src/maps/data/places/<book>.json: the places (PLACE and PLACE+PERSON records) named in that book, with their verses there. The download goes to
// data/raw/tipnr (git-ignored, skipped when present); the JSON is committed. A second run on an unchanged download writes nothing.
// Where a verse of the committed chapter files (public/data) has a word with a place's Strong's number, the place's index in that verse is kept (`pos`), so a verse's places
// are answered in the order the verse names them.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CANON } from '../src/data/canon';
import type { Place } from '../src/maps/types';
import { writeIfChanged } from './data/chapterWriter';
import { parseTipnr, placesOfBook, type TipnrPlace } from './places/tipnr';

/** The file's name in the repository's Proper Nouns folder (the story's URL, 'With All References' in capitals, is a 404). */
export const TIPNR_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Proper%20Nouns/TIPNR%20-%20Translators%20Individualised%20Proper%20Names%20with%20all%20References%20-%20STEPBible.org%20CC%20BY.txt';
const TIPNR_FILE = 'tipnr.txt';

export async function downloadTo(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  writeFileSync(part, Buffer.from(await response.arrayBuffer()));
  renameSync(part, dest);
}

/** The Strong's numbers of the words of a verse, in order ('G4605'), or undefined where the chapter is not at hand. */
export type VerseWords = (book: string, chapter: number, verse: number) => string[] | undefined;

/** 'H0126' and 'H6721H' are H126 and H6721: the number the chapter files use. */
const baseStrong = (strong: string): string => `${strong[0]}${Number.parseInt(strong.slice(1), 10)}`;

/** Adds `pos` to each place that has a word in a verse with one of its Strong's numbers. */
export function withPositions(places: Place[], book: string, wordsOf: VerseWords): Place[] {
  return places.map((place) => {
    const wanted = new Set(place.strongs.map(baseStrong));
    const pos = place.verses.map(([chapter, verse]) => (wordsOf(book, chapter, verse) ?? []).findIndex((s) => wanted.has(s)));
    return pos.some((p) => p >= 0) ? { ...place, pos } : place;
  });
}

/** The words' Strong's numbers from the committed chapter files (public/data/<book>/<chapter>.json), each chapter read once. */
export function chapterFileWords(dataDir: string): VerseWords {
  const cache = new Map<string, Record<number, string[]> | undefined>();
  return (book, chapter, verse) => {
    const key = `${book}/${chapter}`;
    if (!cache.has(key)) {
      const path = join(dataDir, book, `${chapter}.json`);
      if (!existsSync(path)) cache.set(key, undefined);
      else {
        const file = JSON.parse(readFileSync(path, 'utf8')) as { verses: { n: number; g: { s: string }[] }[] };
        cache.set(key, Object.fromEntries(file.verses.map((v) => [v.n, v.g.map((w) => w.s)])));
      }
    }
    return cache.get(key)?.[verse];
  };
}

export interface PlacesBuildOptions {
  rawDir: string;
  /** src/maps/data/places */
  outDir: string;
  wordsOf?: VerseWords;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  log?: (line: string) => void;
}

export interface PlacesBuildResult {
  /** the files written (a book's file is not written when its bytes are unchanged) */
  written: string[];
  /** every book with places */
  books: string[];
  places: TipnrPlace[];
  withCoordinates: number;
  /** the biggest file */
  largest: { book: string; bytes: number };
  /** the references TIPNR gives that could not be read */
  unread: string[];
}

export async function runPlacesBuild(options: PlacesBuildOptions): Promise<PlacesBuildResult> {
  const { rawDir, outDir, wordsOf = () => undefined, download = downloadTo, log = () => undefined } = options;
  const path = join(rawDir, TIPNR_FILE);
  if (!existsSync(path)) {
    log(`downloading ${TIPNR_URL}`);
    await download(TIPNR_URL, path);
  }
  const unread: string[] = [];
  const places = parseTipnr(readFileSync(path, 'utf8'), (line) => unread.push(line));
  const written: string[] = [];
  const books: string[] = [];
  let largest = { book: '', bytes: 0 };
  for (const { code } of CANON) {
    const inBook = withPositions(placesOfBook(places, code), code, wordsOf);
    if (inBook.length === 0) continue;
    books.push(code);
    const text = JSON.stringify(inBook);
    if (writeIfChanged(join(outDir, `${code}.json`), text)) written.push(code);
    const bytes = Buffer.byteLength(text);
    if (bytes > largest.bytes) largest = { book: code, bytes };
  }
  const withCoordinates = places.filter((p) => p.lat !== undefined).length;
  log(`${places.length} places (${withCoordinates} with coordinates), ${books.length} books with places, ${written.length} files written, the largest ${largest.book} ${(largest.bytes / 1024).toFixed(1)} KB`);
  for (const line of unread) log(`warning: ${line}`);
  return { written, books, places, withCoordinates, largest, unread };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runPlacesBuild({ rawDir: 'data/raw/tipnr', outDir: 'src/maps/data/places', wordsOf: chapterFileWords('public/data'), log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
