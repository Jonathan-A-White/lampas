// src/maps/mapsFor.ts — the maps of a chapter from a list of sources: each source's cards in its own order, the sources in the list's order.
import type { MapCard, MapRef, MapSource } from './types';

export async function mapsForSources(sources: readonly MapSource[], ref: MapRef): Promise<MapCard[]> {
  const answers = await Promise.all(sources.map((source) => source.mapsFor(ref)));
  return answers.flat();
}
