// src/sermons/known.ts — the sermon sources the index service has told of that the bundle lacks (docs/sermons.md 'When online'), held in memory for whoever draws them: the Sermons sheet (a credit line for each,
// and its rows while the source is On) and the settings registry (src/settings/registry.ts grows an On | Off row for each, the first time it is seen). The list is kept on the phone by
// src/data/repositories/sermonSources.ts; setKnownSermonSources hands it here after it is read or grown. Apart from src/sermons/index.ts so that the registry can listen without loading the module that asks the service.
import type { KnownSermonSource } from '../data/repositories/sermonSources';
import { serviceSource } from './sources/service';
import type { SermonSource } from './types';

let known: readonly KnownSermonSource[] = [];
const listeners = new Set<(list: readonly KnownSermonSource[]) => void>();

export const knownSermonSources = (): readonly KnownSermonSource[] => known;

/** The known sources as sources the sheet can use: they hold no rows of their own (the service gives them). */
export const knownSources = (): SermonSource[] => known.map(serviceSource);

/** Replaces the known list and tells whoever listens. */
export function setKnownSermonSources(list: readonly KnownSermonSource[]): void {
  known = list;
  for (const listener of [...listeners]) listener(known);
}

/** Calls `listener` with the list at every change; returns the unsubscribe. */
export function onKnownSermonSources(listener: (list: readonly KnownSermonSource[]) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
