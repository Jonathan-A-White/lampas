// src/sermons/index.ts — the sermons module's door (docs/sermons.md): the registry of sources and sermonsFor, the sermons of a place. A second source is one file in src/sermons/sources/ and one line in SOURCES.
import { enabledSources as enabledOf } from './enabled';
import { SOURCES } from './sources';
import { sermonsForSources } from './sermonsFor';
import type { SermonPlace, SermonRow, SermonsFound, SermonSource } from './types';

export type { SermonPlace, SermonRow, SermonSource, SermonsFound } from './types';

export { SOURCES };

/** The sources in use: SOURCES, or a list a test put in their place. */
let active: readonly SermonSource[] = SOURCES;

/** The test seam (tests/support/test-sermons.ts): the sources the screens ask, or `undefined` for the registered ones again. */
export function setSermonSources(sources: readonly SermonSource[] | undefined): void {
  active = sources ?? SOURCES;
}

/**
 * The sources that are on (src/sermons/enabled.ts). Every source reads as On (its `default`) until Settings has a switch per source (the next story): this is where those values are read. Registry order.
 */
export async function enabledSources(sources: readonly SermonSource[] = active): Promise<SermonSource[]> {
  return enabledOf(sources, () => undefined);
}

/** The sermons of a place from every source that is on: for a verse or a passage those preached on it first, then the rest of the chapter (src/sermons/sermonsFor.ts); { here: [], chapter: [] } where there are none. */
export async function sermonsFor(place: SermonPlace): Promise<SermonsFound> {
  return sermonsForSources(await enabledSources(), place);
}

/** The number of sermons a found set holds. */
export const countOf = (found: SermonsFound): number => found.here.length + found.chapter.length;

/** The source a row came from: it knows the row's credit and its home page. */
export function sourceOf(row: Pick<SermonRow, 'source'>): SermonSource | undefined {
  return active.find((source) => source.id === row.source);
}
