// src/sermons/enabled.ts — which sermon sources are in use (docs/sermons.md, as src/maps/enabled.ts): a source is on by its own switch ('sermons.<id>', its `default` where nothing is saved), and a source that `needs`
// Logos is left out too while the Logos study resource ('resource.logos') is not On. A source that opens in Logos resources (`resources`) is also left out unless his Library import says he owns one of them or Logos gives it
// free (mw-qtu3zvz.94, src/library/owned.ts), and it lists only the rows of the resources that are offered. Pure: `read(key)` gives a setting's value as text (undefined for one never saved), `owned` the Resource IDs of
// his import; src/sermons/index.ts hands the values in.
import { addressOffered, isOffered, type Owned } from '../library/owned';
import type { SermonSource } from './types';

/** The key a source's switch is kept under. */
export const sourceKey = (source: Pick<SermonSource, 'id'>): string => `sermons.${source.id}`;

/** The key of each study resource a source can need. */
export const NEEDED_KEY: Record<NonNullable<SermonSource['needs']>, string> = { logos: 'resource.logos' };

/** The pseudo-key Settings reads for 'does his import hold this source's Logos archive' ('on' or 'off'): the Sermons row of a Logos source is drawn only while it is on (src/settings/rows.ts readValues). */
export const OWNS_PREFIX = 'owns.';
export const ownsKey = (source: Pick<SermonSource, 'id'>): string => `${OWNS_PREFIX}${source.id}`;

/** Whether the source may be offered: it opens in no Logos resource, or one of them is offered. */
export const sourceOffered = (source: Pick<SermonSource, 'resources'>, owned: Owned): boolean => source.resources === undefined || source.resources.some((resource) => isOffered(resource, owned));

/** The source with only the rows of the Logos resources that are offered (a source that opens in none is returned as it is). */
function ownedRowsOf(source: SermonSource, owned: Owned): SermonSource {
  if (source.resources === undefined) return source;
  const kept = <R extends { open: { url: string } }>(rows: R[]): R[] => rows.filter((row) => addressOffered(row.open.url, owned));
  return {
    ...source,
    sermonsFor: async (place) => kept(await source.sermonsFor(place)),
    ...(source.sermonsInBook ? { sermonsInBook: async (book: string) => kept(await source.sermonsInBook!(book)) } : {}),
  };
}

/** The sources that are on, in the order given. With `owned` (his import's Resource IDs), a Logos source is kept only if it is offered, and lists only its offered rows. */
export function enabledSources(sources: readonly SermonSource[], read: (key: string) => string | undefined, owned?: Owned): SermonSource[] {
  return sources
    .filter((source) => {
      if (source.needs && read(NEEDED_KEY[source.needs]) !== 'on') return false;
      if (owned && !sourceOffered(source, owned)) return false;
      const value = read(sourceKey(source));
      return (value === 'on' || value === 'off' ? value : source.default) === 'on';
    })
    .map((source) => (owned ? ownedRowsOf(source, owned) : source));
}
