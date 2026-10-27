// src/maps/sources/logosatlas.ts — the Logos Atlas and the Lexham Geographic Commentary as a link-only MapSource (docs/maps.md, mw-zbjgn3r.7). It draws no map and fetches nothing: its rows open in his own Logos.
// Row A is the web atlas at app.logos.com, on each map of the atlas's own list that covers the verse (src/maps/logosRef.ts, src/maps/data/logosatlas.json) and centred on the verse's places (TIPNR's
// coordinates, src/maps/places.ts); where no map covers the verse, on the base map centred on its places. Row B is the Lexham Geographic Commentary volume of his shelf at the passage, opened as
// src/library/inLogos.ts opens a commentary. The source rides on Logos (`needs`), so it answers only while the Logos study resource is On. Every link is UNVERIFIED on a device until he taps it (docs/resources.md).
import { shelfOf, type ShelfState } from '../../data/repositories';
import { CATALOGUE } from '../../resources/catalogue';
import { bibleRef, schemeName } from '../../resources/logosBible';
import { resourceLink } from '../../resources/logosRes';
import { BASE_MAP, mapsCovering, type LogosAtlasIndex } from '../logosRef';
import { placeName } from '../placeName';
import type { MapCard, MapRef, MapSource, Place } from '../types';

const ATLAS = 'https://app.logos.com/tools/atlas/';
const LGC = 'Lexham Geographic Commentary';

/** The most maps of the atlas a reference answers. */
const MAX_MAPS = 3;

/** The atlas's periods, as the sheet names them under a map's title (the slugs of logosatlas.json `periods`). */
export const PERIOD_NAMES: Readonly<Record<string, string>> = {
  prepatriarchalperiodera: 'Pre-patriarchal period',
  patriarchalperiodera: 'Patriarchal period',
  exodusfromegyptera: 'Exodus from Egypt',
  conquestera: 'Conquest',
  judgesera: 'Judges',
  unitedkingdomera: 'United Kingdom',
  dividedkingdomera: 'Divided Kingdom',
  assyrianexileera: 'Assyrian exile',
  babyloniancaptivityera: 'Babylonian captivity',
  returnfromexileera: 'Return from exile',
  hellenisticera: 'Hellenistic period',
  lifejesusera: 'Life of Jesus',
  earlychurchera: 'Early church',
};

/**
 * Where a volume covers only some chapters of a book its catalogue entry names whole (by Resource ID, then book code): [first, last]. PROVISIONAL (the Mayor's reading: the Pentateuch volume holds the
 * Psalms 78 to 105 only).
 */
const CHAPTERS: Readonly<Record<string, Readonly<Record<string, readonly [number, number]>>>> = { 'LLS:LXGEOCOMMPENT': { psa: [78, 105] } };

/** Where the atlas opens: the centre and the zoom. */
export interface AtlasView {
  lat: number;
  lng: number;
  zoom: number;
}

const hasPosition = (place: Place): place is Place & { lat: number; lng: number } => place.lat !== undefined && place.lng !== undefined;

/**
 * The view that shows the places that have a position: the mean of their latitudes and longitudes, zoomed by the larger spread (8 under 1 degree, 7 up to 3, 6.36, the zoom the atlas itself opens a
 * region at, over 3: PROVISIONAL). Undefined when none has a position.
 */
export function viewOf(places: readonly Place[]): AtlasView | undefined {
  const found = places.filter(hasPosition);
  if (found.length === 0) return undefined;
  const lats = found.map((p) => p.lat);
  const lngs = found.map((p) => p.lng);
  const mean = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;
  const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  return { lat: mean(lats), lng: mean(lngs), zoom: spread > 3 ? 6.36 : spread < 1 ? 8 : 7 };
}

/** The address of a map, centred when there is a view. */
const atlasUrl = (id: string, view?: AtlasView): string => `${ATLAS}${id}${view ? `?zoom=${view.zoom}&style=terrain&lat=${view.lat.toFixed(4)}&lng=${view.lng.toFixed(4)}&layout=one` : ''}`;

const linkCard = (id: string, title: string, period: string, url: string, places: string[] = [], fallback?: string): MapCard => ({
  id,
  source: 'logosatlas',
  title,
  kind: 'link',
  period,
  article: fallback ?? url,
  places,
  open: fallback ? { url, fallback } : { url },
});

/** Row A: the atlas on the maps that cover the reference, or on the base map at the places. */
function atlasCards(ref: MapRef, places: readonly Place[], index: LogosAtlasIndex): MapCard[] {
  const view = viewOf(places);
  const centred = places.filter(hasPosition).map((p) => p.name);
  const covering = mapsCovering(ref, index).slice(0, MAX_MAPS);
  if (covering.length > 0) return covering.map((map) => linkCard(map.id, `Logos Atlas: ${map.title}`, PERIOD_NAMES[map.period] ?? '', atlasUrl(map.id, view), centred));
  if (!view) return [];
  const named = centred.slice(0, 3).join(', ');
  const title = ref.from === undefined ? `Logos Atlas at the places of ${placeName(ref)}` : `Logos Atlas at ${named}${centred.length > 3 ? ` and ${centred.length - 3} more` : ''}`;
  return [linkCard('places', title, '', atlasUrl(BASE_MAP, view), centred)];
}

/** Row B: the first volume of the Lexham Geographic Commentary on his shelf (On or Pinned) that covers the book, opened at the passage. */
function commentaryCards(ref: MapRef, shelf: ReadonlyMap<string, ShelfState>): MapCard[] {
  const target = bibleRef(ref.book, ref.chapter, ref.from);
  if (!target) return [];
  const entry = CATALOGUE.find((e) => {
    const only = CHAPTERS[e.resource]?.[ref.book];
    const state = shelf.get(e.resource);
    return e.series === LGC && e.covers?.includes(ref.book) && (state === 'on' || state === 'pinned') && (!only || (ref.chapter >= only[0] && ref.chapter <= only[1]));
  });
  if (!entry) return [];
  const link = resourceLink(schemeName(entry.resource), `ref=${target}`);
  return [linkCard(entry.resource, `${entry.title} at ${placeName(ref)}`, 'Opens in Logos', link.url, [], link.fallback)];
}

/** The cards of a reference, from the places of its verses, his shelf (by Resource ID) and the atlas's list. Pure. */
export function logosAtlasCards(ref: MapRef, places: readonly Place[], shelf: ReadonlyMap<string, ShelfState>, index: LogosAtlasIndex): MapCard[] {
  return [...atlasCards(ref, places, index), ...commentaryCards(ref, shelf)];
}

let loading: Promise<LogosAtlasIndex> | undefined;

/** The atlas's list, loaded once on first use: its own chunk, never in the precache. */
const loadIndex = (): Promise<LogosAtlasIndex> => (loading ??= import('../data/logosatlas.json').then((module) => module.default as LogosAtlasIndex));

export const logosAtlas: MapSource = {
  id: 'logosatlas',
  name: 'Logos Atlas',
  homepage: 'https://www.logos.com/features/atlas',
  credit: 'Logos Atlas and the Lexham Geographic Commentary, Faithlife; opens in your own Logos',
  describe: 'The Logos Atlas at the verse’s places, and the Lexham commentary, in your Logos.',
  needs: 'logos',
  default: 'on',
  async mapsFor(ref: MapRef, places?: () => Promise<Place[]>): Promise<MapCard[]> {
    // a failed read of the places leaves the atlas rows to the maps that cover the verse: the places are an aid
    const named = places ? places().catch((error: unknown): Place[] => (console.error('could not read the places of the verses', error), [])) : Promise.resolve([]);
    const [index, found, rows] = await Promise.all([loadIndex(), named, shelfOf()]);
    return logosAtlasCards(ref, found, new Map(rows.map((row) => [row.id, row.state])), index);
  },
  imageUrl: () => null,
};
