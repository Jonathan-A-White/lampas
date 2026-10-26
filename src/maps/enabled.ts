// src/maps/enabled.ts — which map sources are in use (docs/maps.md, mw-zbjgn3r.6): a source is on by its own switch in Settings > Study resources > Maps ('maps.<id>', its `default`
// where nothing is saved), and a source that `needs` Logos is left out too while the Logos study resource ('resource.logos') is not On. Pure: `read(key)` gives a setting's value
// as text (undefined for one never saved); src/maps/index.ts reads the store and hands the values in.
import type { MapSource } from './types';

/** The key a source's switch is kept under. */
export const sourceKey = (source: Pick<MapSource, 'id'>): string => `maps.${source.id}`;

/** The key of each study resource a source can need. */
export const NEEDED_KEY: Record<NonNullable<MapSource['needs']>, string> = { logos: 'resource.logos' };

/** The sources that are on, in the order given. */
export function enabledSources(sources: readonly MapSource[], read: (key: string) => string | undefined): MapSource[] {
  return sources.filter((source) => {
    if (source.needs && read(NEEDED_KEY[source.needs]) !== 'on') return false;
    const value = read(sourceKey(source));
    return (value === 'on' || value === 'off' ? value : source.default) === 'on';
  });
}
