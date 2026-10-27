// src/maps/logosRef.ts — the Logos Atlas's references (docs/maps.md, mw-zbjgn3r.7): Logos's own book numbers for our books, the passage forms the atlas's list writes ('bible.32.1.1-32.1.3'), and the
// maps of the list that cover a reference. Pure; the list is src/maps/data/logosatlas.json, copied as the atlas gives it (a map's `passages` are the verses it is tagged to).
import { BOOKS } from '../data/books';
import type { MapRef } from './types';

/** One map of the atlas's list. */
export interface LogosMap {
  id: string;
  title: string;
  /** the atlas's period slug ('dividedkingdomera'); PERIOD_NAMES (sources/logosatlas.ts) names it */
  period: string;
  /** where the atlas lists it: a period's overview map leads the period */
  order: number;
  passages: string[];
}

/** src/maps/data/logosatlas.json. */
export interface LogosAtlasIndex {
  source: string;
  count: number;
  periods: string[];
  maps: LogosMap[];
}

/** The map the atlas opens on where no map of the list covers a verse: the overview of the Pre-patriarchal period, the one map id verified on a device (docs/resources.md). */
export const BASE_MAP = 'BIBLICALWORLDPREPATRIARCHALPERIOD-EN';

/**
 * Logos's bible datatype number of one of our books: Genesis 1 ... Malachi 39, then Matthew 61 ... Revelation 87 (40 to 60 are the books of the deuterocanon, which the app has not). Undefined for a code
 * that is no book.
 */
export function toLogosBook(book: string): number | undefined {
  const at = BOOKS.findIndex((b) => b.code === book);
  if (at < 0) return undefined;
  return at < 39 ? at + 1 : at + 22;
}

/** A place in the Bible as the atlas numbers it: its book, chapter and verse; verse 0 and Infinity bound a whole chapter. */
type Point = readonly [book: number, chapter: number, verse: number];

const before = (a: Point, b: Point): number => a[0] - b[0] || a[1] - b[1] || (a[2] === b[2] ? 0 : a[2] < b[2] ? -1 : 1);

/**
 * The two ends of a passage as the list writes it: bible.B.C.V, bible.B.C.V-B.C.V, bible.B.C.V-C.V, bible.B.C.V-V, bible.B.C (a whole chapter) and bible.19.N.title (a Psalm's title, verse 1).
 * Undefined for a form that is none of these.
 */
function ends(passage: string): { start: Point; end: Point } | undefined {
  const parts = /^bible\.(\d+)\.(\d+)(?:\.(\d+|title))?(?:-(\d+)(?:\.(\d+))?(?:\.(\d+))?)?$/.exec(passage);
  if (!parts) return undefined;
  const [, b, c, v, x, y, z] = parts;
  const book = Number(b);
  const chapter = Number(c);
  if (v === undefined) return x === undefined ? { start: [book, chapter, 0], end: [book, chapter, Infinity] } : undefined;
  const verse = v === 'title' ? 1 : Number(v);
  const start: Point = [book, chapter, verse];
  if (x === undefined) return { start, end: start };
  // the end: V, C.V or B.C.V
  const end: Point = z !== undefined ? [Number(x), Number(y), Number(z)] : y !== undefined ? [book, Number(x), Number(y)] : [book, chapter, Number(x)];
  return { start, end };
}

/** The ends of the reference: a verse, a range of verses or, with no `from`, the whole chapter. */
function refEnds(ref: MapRef): { start: Point; end: Point } | undefined {
  const book = toLogosBook(ref.book);
  if (book === undefined) return undefined;
  if (ref.from === undefined) return { start: [book, ref.chapter, 0], end: [book, ref.chapter, Infinity] };
  return { start: [book, ref.chapter, ref.from], end: [book, ref.chapter, ref.to ?? ref.from] };
}

/** Whether the passage holds the reference: a verse inside it, or, for a range or a chapter, any verse of it inside. */
export function spanHolds(passage: string, ref: MapRef): boolean {
  const span = ends(passage);
  const wanted = refEnds(ref);
  return span !== undefined && wanted !== undefined && before(span.start, wanted.end) <= 0 && before(span.end, wanted.start) >= 0;
}

/** How wide a passage is, to rank the narrower first: its chapters by a thousand and its verses. */
const widthOf = (passage: string): number => {
  const span = ends(passage);
  return span === undefined ? Infinity : (span.end[1] - span.start[1]) * 1000 + Math.min(span.end[2], 999) - span.start[2];
};

/** How many verses of the reference's chapter the passages cover (a chapter is taken to have at most 176 verses: the count only ranks maps against each other). */
function covered(passages: readonly string[], ref: MapRef): number {
  const book = toLogosBook(ref.book);
  const taken = new Set<number>();
  for (const passage of passages) {
    const span = ends(passage);
    if (!span || book === undefined) continue;
    const here = (point: Point): boolean => point[0] === book && point[1] === ref.chapter;
    const lo = here(span.start) ? Math.max(span.start[2], 1) : before(span.start, [book, ref.chapter, 0]) < 0 ? 1 : 177;
    const hi = here(span.end) ? Math.min(span.end[2], 176) : before(span.end, [book, ref.chapter, 0]) > 0 ? 176 : 0;
    for (let verse = lo; verse <= hi; verse++) taken.add(verse);
  }
  return taken.size;
}

/**
 * The maps of the list that cover the reference, the one with the narrowest covering passage first (a story map before the overview of its period). A tie goes to the map tagged to fewer passages
 * (a story map has a handful, an overview many) and then to the list's own order. For a whole chapter the map that covers the most of it comes first, so that a map tagged to one verse of the chapter
 * in passing ('God who made the sea') does not lead the maps of the story told there.
 */
export function mapsCovering(ref: MapRef, index: Pick<LogosAtlasIndex, 'maps'>): LogosMap[] {
  const chapter = ref.from === undefined;
  return index.maps
    .flatMap((map) => {
      const holding = map.passages.filter((p) => spanHolds(p, ref));
      return holding.length === 0 ? [] : [{ map, width: Math.min(...holding.map(widthOf)), verses: chapter ? covered(holding, ref) : 0 }];
    })
    .sort((a, b) => b.verses - a.verses || a.width - b.width || a.map.passages.length - b.map.passages.length || a.map.order - b.map.order)
    .map(({ map }) => map);
}
