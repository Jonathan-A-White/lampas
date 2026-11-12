// src/services/sermons.ts — the client of the sermon index service (the sermon-index repository's `sermons serve`; its docs/api.md is the contract; docs/sermons.md 'When online').
// It is free: no licence, no device key, nothing signed, and never the mill (src/services/mill.ts is the one gated client; docs/layout/licence.md). It is another origin (VITE_SERMONS_URL, src/config.ts), so the
// Postern CORS note in docs/commands.md is not about it; the service allows https://lampas.allmymind.org itself. Each call waits 2 seconds at most (the sheet shows the bundled index at once and says 'Offline' when this fails).
import { SERMONS_URL } from '../config';
import { within } from '../data/within';

/** How long a call waits before it gives up. */
export const SERVICE_WAIT_MS = 2000;

/** One sermon as `GET /v1/sermons` answers it (docs/api.md 'GET /v1/sermons'); a field Lampas does not know is ignored. */
export interface ServiceSermon {
  source: string;
  id: string;
  title: string;
  preacher: string | null;
  date: string | null;
  url: string;
  alt_url: string | null;
  kind: string;
  /** the passage that answered, OSIS (`Rom.5.8`, `Rom.5.12-Rom.6.4`) */
  ref: string;
  role: 'text' | 'cited';
  width: number;
}

/**
 * A sermon the theme tier names: the row, and how it came in. A sermon its source linked to the topic itself, from the sermon notes (docs/api.md 'Direct links', at sermon-index 6d1d505a), has `direct: true`; a row reached
 * through its preaching text has no `direct` key at all. A direct row has `ref`, `role` and `width` null when the sermon has no preaching text.
 */
export interface ServiceThemeSermon extends Omit<ServiceSermon, 'ref' | 'role' | 'width'> {
  ref: string | null;
  role: 'text' | 'cited' | null;
  width: number | null;
  direct?: true;
  theme: { source: string; topic: string; label: string; part: number | null; part_label: string | null };
}

/** One source as `GET /v1/sources` lists it. */
export interface ServiceSource {
  id: string;
  name: string;
  kind: 'sermons' | 'themes';
  licence: string;
  credit: string;
  homepage: string;
  on_by_default: boolean;
  /** the one church or preacher the whole source is of (mw-qtu3zvz.89); absent where it is of many, and from a service that does not say */
  by?: string;
  rows: number;
}

/** One topic as `GET /v1/themes` lists it. */
export interface ServiceTheme {
  source: string;
  topic: string;
  label: string;
  part: number | null;
  part_label: string | null;
  ref: string;
  see: string[];
  sermons: number;
  verses: number;
}

/** One hit of `GET /v1/search`: a sermon (it has a url) or a theme (it has none). */
export interface ServiceHit {
  kind: 'sermon' | 'theme';
  source: string;
  id: string;
  title: string;
  ref: string | null;
  url: string | null;
  rank: number;
}

/** The address of the service: SERMONS_URL, or the one a test put in its place (setSermonsUrl). Empty: no service. */
let base = SERMONS_URL;

/** The test seam (docs/sermons.md 'When online'): the address the calls use, or `undefined` for the build's own again. Empty means there is no service. */
export function setSermonsUrl(url: string | undefined): void {
  base = url === undefined ? SERMONS_URL : url.trim().replace(/\/+$/, '');
}

/** Whether there is a service to ask at all. */
export const sermonsServiceKnown = (): boolean => base !== '';

/** The words the sheet's search sends at most (the service refuses a longer query, docs/api.md 'GET /v1/search'). */
export const SEARCH_MAX = 200;

async function get<T>(path: string, query: Record<string, string | undefined>): Promise<T> {
  if (base === '') throw new Error('no sermon index service');
  const params = Object.entries(query).flatMap(([name, value]) => (value === undefined ? [] : [`${encodeURIComponent(name)}=${encodeURIComponent(value).replace(/%2C/gi, ',').replace(/%3A/gi, ':')}`]));
  const url = `${base}${path}${params.length > 0 ? `?${params.join('&')}` : ''}`;
  return within(async (signal) => {
    // the very GET, with no cookie, no key and no header of ours: another origin's CORS lets the plain request through
    const response = await fetch(url, { signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`the sermon index answered ${response.status}`);
    return (await response.json()) as T;
  }, SERVICE_WAIT_MS);
}

/**
 * The sermons whose passage overlaps `ref` (OSIS or a Lampas code: `Rom.5`, `rom.5.8`) in the sources `sources` (their ids; none given means every source the service has).
 * `limit` is the page (1 to 200, the service's own default 50). Throws when the service is unknown, answers badly or does not answer in 2 seconds.
 */
export async function fetchSermons(ref: string, sources?: readonly string[], limit?: number): Promise<{ ref: string; total: number; rows: ServiceSermon[] }> {
  return get('/v1/sermons', { ref, source: sources === undefined ? undefined : sources.join(','), limit: limit === undefined ? undefined : String(limit) });
}

/** The sermons of one topic, by the theme tier asked over the whole Bible (`GET /v1/sermons?tier=theme-only&theme=<source>:<topic>`): the sheet's list under a theme found by the search. */
export async function fetchThemeSermons(source: string, topic: string, limit = 50): Promise<{ total: number; rows: ServiceThemeSermon[] }> {
  const answer = await get<{ theme: { total: number; rows: ServiceThemeSermon[] } }>('/v1/sermons', { ref: 'Gen.1.1-Rev.22.21', tier: 'theme-only', theme: `${source}:${topic}`, limit: String(limit) });
  return answer.theme;
}

/**
 * The sermons its source linked directly to a topic that links `ref` (a verse or a passage, `rom.5.8`, `rom.5.6-rom.5.8`) in the sources `sources` (their ids): the theme tier asked for direct links alone (`direct=only`, docs/api.md
 * 'Direct links'). An older service ignores `direct`, so the caller keeps only the rows marked `direct`. Throws as the other calls do.
 */
export async function fetchDirectThemeSermons(ref: string, sources: readonly string[]): Promise<ServiceThemeSermon[]> {
  const answer = await get<{ theme: { rows: ServiceThemeSermon[] } }>('/v1/sermons', { ref, tier: 'theme-only', source: sources.join(','), direct: 'only', limit: '200' });
  return answer.theme.rows;
}

/** Every source the service has, sermon sources first (`GET /v1/sources`). */
export async function fetchSources(): Promise<ServiceSource[]> {
  return (await get<{ rows: ServiceSource[] }>('/v1/sources', {})).rows;
}

/** The topics linked to a passage overlapping `ref` (`GET /v1/themes`). */
export async function fetchThemes(ref: string): Promise<ServiceTheme[]> {
  return (await get<{ rows: ServiceTheme[] }>('/v1/themes', { ref })).rows;
}

/** The best 50 sermons and themes for the words `q` (`GET /v1/search`); an empty query, or one over SEARCH_MAX characters, is no request. */
export async function search(q: string): Promise<ServiceHit[]> {
  const words = q.trim();
  if (words === '' || words.length > SEARCH_MAX) return [];
  return (await get<{ rows: ServiceHit[] }>('/v1/search', { q: words })).rows;
}
