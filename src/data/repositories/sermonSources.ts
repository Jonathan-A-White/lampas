// src/data/repositories/sermonSources.ts — the sermon sources the index service has told of that the bundle lacks (docs/sermons.md 'When online'): kept as one list so that each has its On | Off row in Settings
// from the first time it is seen, and its credit on the sheet, whether or not the phone is online later. A repository owns its transactions; the list is one row of `meta`.
import { db } from '../db';

/** A sermon source of the service that the bundled index lacks, as `GET /v1/sources` described it when first seen. */
export interface KnownSermonSource {
  id: string;
  name: string;
  credit: string;
  homepage: string;
  /** the service's `on_by_default`: whether a reader who never chose sees it */
  onByDefault: boolean;
  /** the service's `by` (mw-qtu3zvz.89): the one church or preacher the whole source is of, shown on the Sermons sheet where a sermon has no preacher; absent where the source is of many or the service does not say */
  by?: string;
}

const KEY = 'sermonSources';

const isKnown = (v: unknown): v is KnownSermonSource => {
  const k = v as Partial<KnownSermonSource> | null;
  return typeof k === 'object' && k !== null && typeof k.id === 'string' && typeof k.name === 'string' && typeof k.credit === 'string' && typeof k.homepage === 'string' && typeof k.onByDefault === 'boolean';
};

/** A kept source as it is read: a `by` that is no non-empty string is dropped (the source stays), and a list kept before `by` existed is read as it is. */
const withoutBadBy = (k: KnownSermonSource): KnownSermonSource => {
  if (k.by === undefined || (typeof k.by === 'string' && k.by !== '')) return k;
  return { id: k.id, name: k.name, credit: k.credit, homepage: k.homepage, onByDefault: k.onByDefault };
};

/** The sources kept, in the order they were first seen; none while nothing is kept or the kept list cannot be read. */
export async function getKnownSermonSources(): Promise<KnownSermonSource[]> {
  const raw = (await db.meta.get(KEY))?.value;
  if (raw === undefined) return [];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isKnown).map(withoutBadBy) : [];
  } catch {
    return [];
  }
}

/**
 * Keeps `listed` (the service's sermon sources the bundle lacks): a source not kept yet is added at the end, and the ones that are told its details again are refreshed. Returns the sources seen for the first time.
 */
export async function rememberSermonSources(listed: readonly KnownSermonSource[]): Promise<KnownSermonSource[]> {
  return db.transaction('rw', db.meta, async () => {
    const kept = await getKnownSermonSources();
    const ids = new Set(kept.map((k) => k.id));
    const fresh = listed.filter((source, i) => !ids.has(source.id) && listed.findIndex((s) => s.id === source.id) === i);
    const next = [...kept.map((k) => listed.find((s) => s.id === k.id) ?? k), ...fresh];
    if (JSON.stringify(next) !== JSON.stringify(kept)) await db.meta.put({ key: KEY, value: JSON.stringify(next) });
    return fresh;
  });
}
