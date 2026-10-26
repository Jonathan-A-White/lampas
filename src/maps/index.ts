// src/maps/index.ts — the maps module's door (docs/maps.md): the registry of sources and mapsFor, the maps of a chapter. A second atlas is one file in
// src/maps/sources/ and one line in SOURCES. Verse ranking of the cards (the verses of a ref) is a later story's.
import { bibleMapper } from './sources/biblemapper';
import { mapsForSources } from './mapsFor';
import type { MapCard, MapRef, MapSource } from './types';

export type { MapCard, MapRef, MapSource } from './types';

export const SOURCES: readonly MapSource[] = [bibleMapper];

/** The maps of a chapter from every registered source, in the source's order; [] where there are none. */
export function mapsFor(ref: MapRef): Promise<MapCard[]> {
  return mapsForSources(SOURCES, ref);
}
