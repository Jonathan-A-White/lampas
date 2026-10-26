// src/maps/types.ts — the maps module's shapes (docs/maps.md). A MapSource answers the maps of a chapter as MapCards; the sheet that shows them
// (the next story) knows only these, so a second atlas is one file in src/maps/sources/ and a line in the registry (src/maps/index.ts).

/** Where in the Bible a map is asked for: the app's book code (src/data/canon.ts), a chapter, and optionally verses (a source that maps by the chapter ignores them). */
export interface MapRef {
  book: string;
  chapter: number;
  from?: number;
  to?: number;
}

export type MapKind = 'event' | 'region' | 'video';

export type MapImageSize = 'low' | 'medium' | 'high';

export interface MapCard {
  /** unique within its source */
  id: string;
  /** the MapSource.id it came from */
  source: string;
  title: string;
  kind: MapKind;
  /** the years the map covers, negative for BC, only where the source gives them */
  start?: number;
  end?: number;
  /** the years as a display string (src/maps/period.ts); empty for a map with no dates */
  period: string;
  /** the page about the map at the source: where the larger images are */
  article: string;
  /** the places the map names */
  places: string[];
  video?: boolean;
  /** the names of the passage's places (src/maps/places.ts) that this map shows; set by mapsFor, empty for a whole chapter (src/maps/mapsFor.ts rankByPlaces) */
  matched?: string[];
}

export interface MapSource {
  id: string;
  name: string;
  homepage: string;
  /** the credit line shown with every map of this source */
  credit: string;
  mapsFor(ref: MapRef): Promise<MapCard[]>;
  /** the address of the card's image at that size, or null where the source has none to show (a link-only source answers null for all) */
  imageUrl(card: MapCard, size: MapImageSize): string | null;
  /** the source's own page of every map of the chapter (the link 'All maps for Genesis 10 at Bible Mapper'), or null where it has none */
  allMapsUrl?(ref: MapRef): string | null;
}

/** src/maps/data/biblemapper.json, written by `npm run maps:build` (scripts/maps/biblemapper.ts). */
export interface BibleMapperMap {
  title: string;
  kind: MapKind;
  start?: number;
  end?: number;
  /** the blog article about the map */
  article: string;
  /** the file names under biblemapper.com/blog/images/ and the width the site sets it at, in inches; a video has none */
  image?: { low: string; medium: string; high: string; width: number };
  places: string[];
  /** a video's file name */
  video?: string;
}

export interface BibleMapperData {
  /** the date the site gives its own list (LastUpdated) */
  updated: string;
  /** the basenames, sorted: a map's number in `chapters` is its place in this list (a basename in every chapter that names it was 70 KB; a number is under 20) */
  ids: string[];
  /** by basename */
  maps: Record<string, BibleMapperMap>;
  /** by the app's book code, then the chapter number: the numbers (in `ids`) of its maps in the site's order, audio-visual readings last */
  chapters: Record<string, Record<string, number[]>>;
}

/** A place of the Bible from STEPBible's TIPNR, in one book's file (src/maps/data/places/<book>.json, written by `npm run places:build`, docs/maps.md). */
export interface Place {
  /** TIPNR's UniqueName ('Gerar@Gen.10.19-2Ch') */
  id: string;
  /** the ESV form of the name */
  name: string;
  /** every form of the name: the 'All names' of TIPNR and its KJV and NIV forms, once each */
  names: string[];
  /** the disambiguated Strong's numbers of the place ('H1642') */
  strongs: string[];
  /** where it lies, from OpenBible.info; absent where TIPNR has no position */
  lat?: number;
  lng?: number;
  /** the geographical area TIPNR gives ('Philistia'); absent where it gives none */
  region?: string;
  /** the verses of THIS book that name it, [chapter, verse] in order */
  verses: [number, number][];
  /** where it stands in each of those verses: the index of the word in the verse (the same order as `verses`), -1 where the text does not show it; absent when no verse shows it */
  pos?: number[];
}
