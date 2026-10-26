// src/maps/index.ts — the maps module's door (docs/maps.md): the registry of sources and mapsFor, the maps of a chapter. A second atlas is one file in
// src/maps/sources/ and one line in SOURCES. Verses rank the cards by the places they name (places.ts, mapsFor.ts).
import { bibleMapper } from './sources/biblemapper';
import { mapsForSources, rankByPlaces } from './mapsFor';
import { placesIn } from './places';
import type { MapCard, MapRef, MapSource } from './types';

export type { MapCard, MapRef, MapSource, Place } from './types';

export const SOURCES: readonly MapSource[] = [bibleMapper];

/** The sources in use: SOURCES, or a list a test put in their place. */
let active: readonly MapSource[] = SOURCES;

/** The test seam (tests/support/test-maps.ts): the sources the screens ask, or `undefined` for the registered ones again. */
export function setMapSources(sources: readonly MapSource[] | undefined): void {
  active = sources ?? SOURCES;
}

/**
 * The maps of a chapter from every registered source, in the source's order; [] where there are none. For a verse or a passage (`from` set) the cards that show a place the
 * verses name come first, each with `matched` (src/maps/mapsFor.ts rankByPlaces); a chapter's order is the source's.
 */
export async function mapsFor(ref: MapRef): Promise<MapCard[]> {
  const cards = await mapsForSources(active, ref);
  if (ref.from === undefined || cards.length === 0) return rankByPlaces(cards, undefined);
  try {
    return rankByPlaces(cards, await placesIn(ref));
  } catch (error) {
    // the places are an aid: without them the chapter's maps are all there are
    console.error('could not read the places of the verses', error);
    return rankByPlaces(cards, undefined);
  }
}

/** The source a card came from: it knows the card's picture, its credit and its homepage. */
export function sourceOf(card: MapCard): MapSource | undefined {
  return active.find((source) => source.id === card.source);
}
