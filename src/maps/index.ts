// src/maps/index.ts — the maps module's door (docs/maps.md): the registry of sources and mapsFor, the maps of a chapter. A second atlas is one file in
// src/maps/sources/ and one line in SOURCES. Verse ranking of the cards (the verses of a ref) is a later story's.
import { bibleMapper } from './sources/biblemapper';
import { mapsForSources } from './mapsFor';
import type { MapCard, MapRef, MapSource } from './types';

export type { MapCard, MapRef, MapSource } from './types';

export const SOURCES: readonly MapSource[] = [bibleMapper];

/** The sources in use: SOURCES, or a list a test put in their place. */
let active: readonly MapSource[] = SOURCES;

/** The test seam (tests/support/test-maps.ts): the sources the screens ask, or `undefined` for the registered ones again. */
export function setMapSources(sources: readonly MapSource[] | undefined): void {
  active = sources ?? SOURCES;
}

/** The maps of a chapter from every registered source, in the source's order; [] where there are none. */
export function mapsFor(ref: MapRef): Promise<MapCard[]> {
  return mapsForSources(active, ref);
}

/** The source a card came from: it knows the card's picture, its credit and its homepage. */
export function sourceOf(card: MapCard): MapSource | undefined {
  return active.find((source) => source.id === card.source);
}
