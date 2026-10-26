// src/maps/places.ts — the places named in a verse (docs/maps.md): STEPBible's TIPNR, cut into one file per book (src/maps/data/places/<book>.json, `npm run places:build`) and
// loaded on first use, a book at a time, each as its own chunk; never in the precache. placesIn(ref) answers the places of the verses from..to (the whole chapter when no verse is given).
import type { MapRef, Place } from './types';

const FILES = import.meta.glob<Place[]>('./data/places/*.json', { import: 'default' });

/** Reads a book's places: the committed file, or the test seam's. */
type Loader = (book: string) => Promise<Place[]>;

const fromFiles: Loader = async (book) => {
  const load = FILES[`./data/places/${book}.json`];
  return load ? load() : [];
};

let loader: Loader = fromFiles;
const books = new Map<string, Promise<Place[]>>();

/** The test seam (tests/support/test-maps.ts): the places of a book as a test holds them, or `undefined` for the committed files again. */
export function setPlaceLoader(next: Loader | undefined): void {
  loader = next ?? fromFiles;
  books.clear();
}

/** The places of a whole book, loaded once; [] for a book with none. */
export function placesOfBook(book: string): Promise<Place[]> {
  let found = books.get(book);
  if (!found) {
    found = loader(book);
    // a failed load is asked again next time
    found.catch(() => books.delete(book));
    books.set(book, found);
  }
  return found;
}

/**
 * The places named in the verses `from`..`to` of a chapter (`from` alone is that verse; neither is the whole chapter), in the order the verses name them: by verse, then by where
 * the verse's words show the place, then as the file lists them. Each once. [] where the chapter names none.
 */
export async function placesIn(ref: MapRef): Promise<Place[]> {
  const first = ref.from ?? 0;
  const last = ref.from === undefined ? Number.POSITIVE_INFINITY : (ref.to ?? ref.from);
  const found: { place: Place; verse: number; pos: number; index: number }[] = [];
  (await placesOfBook(ref.book)).forEach((place, index) => {
    // the place's first mention in the range: the earliest verse, and in it the earliest word
    let best: { verse: number; pos: number } | undefined;
    place.verses.forEach(([chapter, verse], i) => {
      if (chapter !== ref.chapter || verse < first || verse > last) return;
      const word = place.pos?.[i] ?? -1;
      const pos = word < 0 ? Number.MAX_SAFE_INTEGER : word;
      if (!best || verse < best.verse || (verse === best.verse && pos < best.pos)) best = { verse, pos };
    });
    if (best) found.push({ place, index, ...best });
  });
  return found.sort((a, b) => a.verse - b.verse || a.pos - b.pos || a.index - b.index).map((f) => f.place);
}
