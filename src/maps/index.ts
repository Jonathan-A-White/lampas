// src/maps/index.ts — the maps module's door (docs/maps.md): the registry of sources and mapsFor, the maps of a chapter. A second atlas is one file in
// src/maps/sources/ and one line in SOURCES. Verses rank the cards by the places they name (places.ts, mapsFor.ts).
import { getStudyResources } from '../data/repositories';
import { getSetting } from '../settings/store';
import { mapSourceSetting } from '../settings/definitions/maps';
import { enabledSources as enabledOf, NEEDED_KEY } from './enabled';
import { SOURCES } from './sources';
import { mapsForSources, rankPerSource } from './mapsFor';
import { placesIn } from './places';
import type { MapCard, MapRef, MapSource, Place } from './types';

export type { MapCard, MapRef, MapSource, Place } from './types';

export { SOURCES };

/** The sources in use: SOURCES, or a list a test put in their place. */
let active: readonly MapSource[] = SOURCES;

/** The test seam (tests/support/test-maps.ts): the sources the screens ask, or `undefined` for the registered ones again. */
export function setMapSources(sources: readonly MapSource[] | undefined): void {
  active = sources ?? SOURCES;
}

/**
 * The sources that are on (src/maps/enabled.ts): each one's switch in Settings > Study resources > Maps, and Logos for a source that needs it. Registry order. `sources` defaults to
 * the ones in use.
 */
export async function enabledSources(sources: readonly MapSource[] = active): Promise<MapSource[]> {
  const values: Record<string, string> = {};
  await Promise.all([
    ...sources.map(async (source) => {
      const def = mapSourceSetting(source);
      values[def.key] = await getSetting(def);
    }),
    ...(sources.some((source) => source.needs)
      ? [getStudyResources().then(({ on }) => Object.entries(NEEDED_KEY).forEach(([id, key]) => (values[key] = on.includes(id) ? 'on' : 'off')))]
      : []),
  ]);
  return enabledOf(sources, (key) => values[key]);
}

/**
 * The maps of a chapter from every source that is on, in the source's order; [] where there are none. For a verse or a passage (`from` set) the cards that show a place the
 * verses name come first within their source, each with `matched` (src/maps/mapsFor.ts rankPerSource); a chapter's order is the source's.
 */
export async function mapsFor(ref: MapRef): Promise<MapCard[]> {
  // the places are read once, when a source or the ranking asks for them
  let places: Promise<Place[]> | undefined;
  const placesOfRef = (): Promise<Place[]> => (places ??= placesIn(ref));
  const cards = await mapsForSources(await enabledSources(), ref, placesOfRef);
  if (ref.from === undefined || cards.length === 0) return rankPerSource(cards, undefined);
  try {
    return rankPerSource(cards, await placesOfRef());
  } catch (error) {
    // the places are an aid: without them the chapter's maps are all there are
    console.error('could not read the places of the verses', error);
    return rankPerSource(cards, undefined);
  }
}

/** The source a card came from: it knows the card's picture, its credit and its homepage. */
export function sourceOf(card: MapCard): MapSource | undefined {
  return active.find((source) => source.id === card.source);
}
