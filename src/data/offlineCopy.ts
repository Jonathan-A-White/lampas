// src/data/offlineCopy.ts — keeps every chapter of a scope on the phone (mw-lcv9z3g.1; docs/data.md 'Offline'). The scope is 'nt' (the 27 books read in Greek),
// 'all' (the 66 books and the Hebrew word lists, which the worker does not precache) or 'none'. Each file is asked for by the address the Reader asks for it
// (chapterUrl, ?v=<fingerprint> from index.json), so the worker's serveChapter keeps it in the data cache (src/dataCache.ts) and drops an older copy of the chapter;
// nothing here writes the cache. What the cache already holds under the very address is not fetched again: the check is `caches.match` from the page, no HEAD.
// A run has at most OFFLINE_CONCURRENCY fetches in flight, pauses on the window's 'offline' event (no new fetch starts) and goes on at 'online'. No screen yet.
// The copy stays current (mw-lcv9z3g.3): refreshOfflineCopy runs at app start (src/main.tsx, after the first render) and after each update check (updateChecked), and keeps the time of the check.
import type { UpdateRegistration } from 'pwa-kit/app-update';
import { CANON_INDEX, greekBooks } from './bookIndex';
import { chapterUrl, type BookIndex } from './chapter';
import { db } from './db';
import { DATA_CACHE } from '../dataCache';
import { within } from './within';

export type OfflineScope = 'none' | 'nt' | 'all';

/** The Hebrew word lists the worker does not precache (pwa-precache.ts has the Greek ones); asked for plain, kept as they first came. */
export const HEBREW_LISTS: readonly string[] = ['/data/lexicon-hbo.json', '/data/frequency-hbo.json'];

/** How many fetches a run has in flight at once. */
export const OFFLINE_CONCURRENCY = 3;

export interface OfflineProgress {
  /** files kept or given up on, so a run that ends has done === total; `failed` says which were given up on */
  done: number;
  total: number;
  /** bytes fetched by this run (a file already kept is not counted) */
  bytes: number;
  /** the addresses that failed twice and were given up on */
  failed: string[];
  /** true while the phone is offline and the run waits */
  paused: boolean;
}

const chaptersOf = (index: BookIndex): string[] => index.books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => chapterUrl(b.code, i + 1, index)));

/** The addresses a scope keeps, in reading order: the New Testament's chapters, or every book's and then the Hebrew lists. `index` is the one in the bundle unless a test gives one. */
export function offlineUrls(scope: OfflineScope, index: BookIndex = CANON_INDEX): string[] {
  if (scope === 'none') return [];
  if (scope === 'nt') return chaptersOf(greekBooks(index));
  return [...chaptersOf(index), ...HEBREW_LISTS];
}

// The chosen scope: one text in the settings store under 'offlineCopy', outside the settings registry (like dailyStore.ts); no Dexie version.
const KEY = 'offlineCopy';

/** The scope he chose; 'none' until he chooses or when the saved value is not a scope. */
export async function getOfflineScope(): Promise<OfflineScope> {
  const value = (await db.settings.get(KEY))?.value;
  return value === 'nt' || value === 'all' ? value : 'none';
}

export async function setOfflineScope(scope: OfflineScope): Promise<void> {
  await db.settings.put({ key: KEY, value: scope });
}

const IDLE: OfflineProgress = { done: 0, total: 0, bytes: 0, failed: [], paused: false };
let current: OfflineProgress = IDLE;
const listeners = new Set<(progress: OfflineProgress) => void>();

/** Where the copy stands now. */
export const offlineProgress = (): OfflineProgress => current;

/** Calls `listener` with the progress at each change; returns the unsubscribe. */
export function onOfflineProgress(listener: (progress: OfflineProgress) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function report(next: OfflineProgress): void {
  current = { ...next, failed: [...next.failed] };
  for (const listener of [...listeners]) listener(current);
}

export interface OfflineDeps {
  /** the index the chapter list and fingerprints come from (the bundle's copy of index.json) */
  index?: BookIndex;
  caches?: Pick<CacheStorage, 'open'>;
  fetcher?: typeof fetch;
  /** where 'offline' and 'online' arrive (the window) */
  events?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  isOnline?: () => boolean;
  /** stops the run: no new fetch starts and it ends with what it has done */
  signal?: AbortSignal;
}

/**
 * Fetches the files of `scope` the data cache lacks and resolves with the final progress; it never rejects for a fetch. A fetch that fails is tried once more
 * (not when it failed because the phone went offline: that waits for 'online' and does not use up the retry), and one that fails twice is listed in `failed`.
 * Progress goes to onOfflineProgress listeners: first with what was already kept, then after each file.
 */
export async function runOfflineCopy(scope: OfflineScope, deps: OfflineDeps = {}): Promise<OfflineProgress> {
  const { index = CANON_INDEX, signal } = deps;
  const caches = deps.caches ?? globalThis.caches;
  const fetcher = deps.fetcher ?? ((input, init) => fetch(input, init));
  const events = deps.events ?? globalThis;
  const isOnline = deps.isOnline ?? (() => globalThis.navigator?.onLine !== false);
  const urls = offlineUrls(scope, index);
  const state: OfflineProgress = { done: 0, total: urls.length, bytes: 0, failed: [], paused: !isOnline() };
  const waiting: Array<() => void> = [];
  const wake = () => waiting.splice(0).forEach((resume) => resume());
  const onOffline = () => {
    state.paused = true;
    report(state);
  };
  const onOnline = () => {
    state.paused = false;
    report(state);
    wake();
  };
  const onAbort = () => wake();
  events.addEventListener('offline', onOffline);
  events.addEventListener('online', onOnline);
  signal?.addEventListener('abort', onAbort);
  try {
    const cache = urls.length && caches ? await caches.open(DATA_CACHE) : undefined;
    const todo: string[] = [];
    for (const url of urls) {
      if (cache && (await cache.match(url))) state.done++;
      else todo.push(url);
    }
    report(state);

    // Waits while paused; false when the run was stopped meanwhile.
    const go = async (): Promise<boolean> => {
      while (state.paused && !signal?.aborted) await new Promise<void>((resume) => waiting.push(resume));
      return !signal?.aborted;
    };
    /** The bytes of `url` fetched, or undefined once it has failed twice. A fetch goes through the worker (serveChapter keeps it); within() gives it an end. */
    const keep = async (url: string): Promise<number | undefined> => {
      for (let attempt = 0; attempt < 2; ) {
        if (!(await go())) return undefined;
        try {
          return await within(async (abort) => {
            const response = await fetcher(url, { signal: abort });
            if (!response.ok) throw new Error(`Could not keep ${url}: ${response.status}`);
            return (await response.arrayBuffer()).byteLength;
          });
        } catch {
          if (!state.paused) attempt++;
        }
      }
      return undefined;
    };
    let next = 0;
    const worker = async () => {
      while (next < todo.length && !signal?.aborted) {
        const url = todo[next++];
        const bytes = await keep(url);
        if (signal?.aborted && bytes === undefined) return;
        if (bytes === undefined) state.failed.push(url);
        else state.bytes += bytes;
        state.done++;
        report(state);
      }
    };
    await Promise.all(Array.from({ length: Math.min(OFFLINE_CONCURRENCY, todo.length) }, worker));
    state.paused = false;
    report(state);
    return current;
  } finally {
    events.removeEventListener('offline', onOffline);
    events.removeEventListener('online', onOnline);
    signal?.removeEventListener('abort', onAbort);
  }
}

let running: AbortController | undefined;

/** Whether a run started by startOfflineCopy is going (one just stopped counts until it has ended). */
export const offlineRunning = (): boolean => running !== undefined;

/** Stops the run started by startOfflineCopy, if one is going. */
export function stopOfflineCopy(): void {
  running?.abort();
}

/** Runs the copy of the scope saved in the settings store, in place of one already going. */
export async function startOfflineCopy(deps: OfflineDeps = {}): Promise<OfflineProgress> {
  stopOfflineCopy();
  const mine = new AbortController();
  running = mine;
  try {
    return await runOfflineCopy(await getOfflineScope(), { ...deps, signal: deps.signal ? AbortSignal.any([deps.signal, mine.signal]) : mine.signal });
  } finally {
    if (running === mine) running = undefined;
  }
}

// The time of the last check, in ms since 1970, beside the scope (settings store, no Dexie version): what the settings row shows.
const CHECKED_KEY = 'offlineCopyChecked';

/** When the kept copy was last compared with index.json, or undefined if it never was. */
export async function getOfflineCheckedAt(): Promise<number | undefined> {
  const at = Number((await db.settings.get(CHECKED_KEY))?.value);
  return Number.isFinite(at) && at > 0 ? at : undefined;
}

/**
 * Brings the kept copy up to the index: what the data cache lacks under the index's addresses (a changed fingerprint is a missing address) is fetched, and the worker's
 * serveChapter drops the older copy of each. Run at app start and after each update check (updateChecked). `index` is the bundle's unless a test gives one: the worker's
 * precache and the bundle come from the same build, so a build that has only been found (it waits for his tap) shows its index here once it has taken over and the page reloaded.
 * No scope kept, or a run already going (it covers the index itself) unless `force` (he chose a scope in Settings: that run replaces it): nothing is done and no time is written. Otherwise the time is written when the check starts.
 */
export async function refreshOfflineCopy(deps: OfflineDeps & { now?: () => number; force?: boolean } = {}): Promise<OfflineProgress | undefined> {
  const { now = Date.now, force = false, ...run } = deps;
  if ((running && !force) || (await getOfflineScope()) === 'none' || (running && !force)) return undefined;
  await db.settings.put({ key: CHECKED_KEY, value: String(now()) });
  return startOfflineCopy(run);
}

/**
 * The registration for pwa-kit's update check, which calls `onChecked` once a check has ended (the check goes through registration.update()); a check that fails
 * (offline, server down) calls nothing and still rejects, as pwa-kit expects. Everything else is the real registration's, read live.
 */
export function updateChecked(registration: UpdateRegistration, onChecked: () => void): UpdateRegistration {
  return {
    get waiting() {
      return registration.waiting;
    },
    get installing() {
      return registration.installing;
    },
    update: async () => {
      const answer = await registration.update();
      onChecked();
      return answer;
    },
    addEventListener: (type, listener) => registration.addEventListener(type, listener),
    removeEventListener: (type, listener) => registration.removeEventListener(type, listener),
  };
}
