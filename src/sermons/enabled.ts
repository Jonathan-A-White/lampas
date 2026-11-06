// src/sermons/enabled.ts — which sermon sources are in use (docs/sermons.md, as src/maps/enabled.ts): a source is on by its own switch ('sermons.<id>', its `default` where nothing is saved), and a source that `needs`
// Logos is left out too while the Logos study resource ('resource.logos') is not On. Pure: `read(key)` gives a setting's value as text (undefined for one never saved); src/sermons/index.ts hands the values in.
import type { SermonSource } from './types';

/** The key a source's switch is kept under. */
export const sourceKey = (source: Pick<SermonSource, 'id'>): string => `sermons.${source.id}`;

/** The key of each study resource a source can need. */
export const NEEDED_KEY: Record<NonNullable<SermonSource['needs']>, string> = { logos: 'resource.logos' };

/** The sources that are on, in the order given. */
export function enabledSources(sources: readonly SermonSource[], read: (key: string) => string | undefined): SermonSource[] {
  return sources.filter((source) => {
    if (source.needs && read(NEEDED_KEY[source.needs]) !== 'on') return false;
    const value = read(sourceKey(source));
    return (value === 'on' || value === 'off' ? value : source.default) === 'on';
  });
}
