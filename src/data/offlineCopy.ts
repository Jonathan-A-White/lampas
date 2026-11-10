// src/data/offlineCopy.ts — keeps every chapter of a scope on the phone (mw-lcv9z3g.1; docs/data.md 'Offline'). The scope is 'nt' (the 27 books read in Greek), 'hbo' (the 39 Old Testament books and the Hebrew word lists, which the worker
// does not precache), 'lxx' (every chapter of the Septuagint's index, its index and its Greek lexicon, mw-lcv9z3g.6), 'all' (the three together) or 'none'. Each file is asked for by the address the Reader asks for it
// (chapterUrl, ?v=<fingerprint> from index.json), so the worker's serveChapter keeps it in the data cache (src/dataCache.ts) and drops an older copy of the chapter;
// nothing here writes the cache. The free sermon index's book files (public/sermons, mw-qtu3zvz.1) go with the chapters, by their source's fingerprint, through the worker's sermon route. What the cache already holds under the very address is not fetched again: the check is `caches.match` from the page, no HEAD.
// A run has at most OFFLINE_CONCURRENCY fetches in flight, pauses on the window's 'offline' event (no new fetch starts) and goes on at 'online'. No screen yet.
// The copy stays current (mw-lcv9z3g.3): refreshOfflineCopy runs at app start (src/main.tsx, after the first render) and after each update check (updateChecked), and keeps the time of the check.
import type { UpdateRegistration } from 'pwa-kit/app-update';
import { CANON_INDEX, greekBooks } from './bookIndex';
import { chapterUrl, listUrl, type BookIndex } from './chapter';
import { LXX_INDEX_URL, LXX_LEXICON_URL, lxxChapterUrls, type LxxIndex, type LxxShipped } from './lxxChapter';
import { VERSIONED_LISTS } from './versionedLists';
import { CANON } from './canon';
import { db } from './db';
import { DATA_CACHE } from '../dataCache';
import { SERMON_INDEX, sermonBookUrl, type SermonIndex } from './sermonIndex';
import { within } from './within';

export type OfflineScope = 'none' | 'nt' | 'hbo' | 'lxx' | 'all';

/** The Hebrew word lists the worker does not precache (pwa-precache.ts has the Greek ones), each by the address the app asks for it (listUrl: ?v=<fingerprint> from `index`), so the worker keeps it and replaces an older copy. */
export const hebrewLists = (index: BookIndex = CANON_INDEX): string[] => VERSIONED_LISTS.map((list) => listUrl(list, index));

/** How many fetches a run has in flight at once. Six, not three (mw-lcv9z3g.8): a run of scope All on a locally served build at 4x CPU throttle kept 33-39 chapters/s with three and 48-50 with six, none failed; eight was no faster than six. */
export const OFFLINE_CONCURRENCY = 6;

export interface OfflineProgress {
  /** the scope this run keeps, so the row can tell a report of another scope's run (one just replaced) from its own */
  scope: OfflineScope;
  /** how many of the files are chapters (they come first); the rest are the word lists, the sermon files and the Septuagint's index and lexicon */
  chapters: number;
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

/** A chapter's address (the Reader's, /data/<book>/<n>.json?v=, or the Septuagint's, /data-lxx/<book>/<n>.json?v=). */
const CHAPTER_ADDRESS = /^\/data(-lxx)?\/[0-9a-z]+\/\d+\.json\?v=/;

const chaptersOf = (index: BookIndex): string[] => index.books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => chapterUrl(b.code, i + 1, index)));

/** The Old Testament's books of an index: the ones read in Hebrew. */
const hebrewBooks = (index: BookIndex): BookIndex => ({ ...index, books: index.books.filter((b) => b.lang === 'hbo') });

/** The sermon index's book files of a scope (public/sermons, docs/sermons.md): each source's files for the New Testament's books, the Old Testament's, or every book, each by its source's fingerprint. */
function sermonsOf(scope: 'nt' | 'hbo' | 'all', sermons: SermonIndex): string[] {
  const lang = scope === 'nt' ? 'grc' : 'hbo';
  const read = new Set(CANON.filter((b) => scope === 'all' || b.lang === lang).map((b) => b.code));
  return sermons.sources.flatMap((s) => s.books.filter((book) => read.has(book)).map((book) => sermonBookUrl(s.id, book, sermons)));
}

/** The Septuagint's own index and Greek lexicon: asked for plain, the worker answers them network first (src/sw.ts). */
const LXX_FILES = [LXX_INDEX_URL, LXX_LEXICON_URL];

/**
 * The addresses a scope keeps, in reading order: the chapters (the New Testament's, the Old Testament's Hebrew, the Septuagint's, or every book's and the Septuagint's), then the Hebrew lists, then the sermon index's book files of the same
 * books, then the Septuagint's index and lexicon. `index` and `sermons` are the ones in the bundle unless a test gives one; `lxx` is the Septuagint's index (/data-lxx/index.json, written at deploy, so a run
 * fetches it): without it the Septuagint has no chapters to list.
 */
export function offlineUrls(scope: OfflineScope, index: BookIndex = CANON_INDEX, sermons: SermonIndex = SERMON_INDEX, lxx: LxxShipped | null = null): string[] {
  const septuagint = lxx ? lxxChapterUrls(lxx) : [];
  if (scope === 'none') return [];
  if (scope === 'nt') return [...chaptersOf(greekBooks(index)), ...sermonsOf('nt', sermons)];
  if (scope === 'hbo') return [...chaptersOf(hebrewBooks(index)), ...hebrewLists(index), ...sermonsOf('hbo', sermons)];
  if (scope === 'lxx') return [...septuagint, ...LXX_FILES];
  return [...chaptersOf(index), ...septuagint, ...hebrewLists(index), ...sermonsOf('all', sermons), ...LXX_FILES];
}

/** Whether a scope keeps the Septuagint, whose index is fetched at the start of a run. */
export const keepsSeptuagint = (scope: OfflineScope): boolean => scope === 'lxx' || scope === 'all';

// The chosen scope: one text in the settings store under 'offlineCopy', outside the settings registry (like dailyStore.ts); no Dexie version.
const KEY = 'offlineCopy';

/** The scope he chose; 'none' until he chooses or when the saved value is not a scope. */
export async function getOfflineScope(): Promise<OfflineScope> {
  const value = (await db.settings.get(KEY))?.value;
  return value === 'nt' || value === 'hbo' || value === 'lxx' || value === 'all' ? value : 'none';
}

export async function setOfflineScope(scope: OfflineScope): Promise<void> {
  await db.settings.put({ key: KEY, value: scope });
}

const IDLE: OfflineProgress = { scope: 'none', chapters: 0, done: 0, total: 0, bytes: 0, failed: [], paused: false };
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
  /** the sermon index the book files and their fingerprints come from (the bundle's copy of public/sermons/index.json) */
  sermons?: SermonIndex;
  /** the Septuagint's index (/data-lxx/index.json): a run of a scope that keeps the Septuagint fetches it unless a test gives it */
  lxx?: LxxShipped;
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
  const { index = CANON_INDEX, sermons = SERMON_INDEX, signal } = deps;
  const caches = deps.caches ?? globalThis.caches;
  const fetcher = deps.fetcher ?? ((input, init) => fetch(input, init));
  const events = deps.events ?? globalThis;
  const isOnline = deps.isOnline ?? (() => globalThis.navigator?.onLine !== false);
  const state: OfflineProgress = { scope, chapters: 0, done: 0, total: 0, bytes: 0, failed: [], paused: !isOnline() };
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
    // Waits while paused; false when the run was stopped meanwhile.
    const go = async (): Promise<boolean> => {
      while (state.paused && !signal?.aborted) await new Promise<void>((resume) => waiting.push(resume));
      return !signal?.aborted;
    };
    /** What `read` makes of the answer for `url`, or undefined once it has failed twice. A fetch goes through the worker (serveChapter keeps it); within() gives it an end. */
    const attempt = async <T>(url: string, read: (response: Response) => Promise<T>, init: RequestInit = {}): Promise<T | undefined> => {
      for (let tries = 0; tries < 2; ) {
        if (!(await go())) return undefined;
        try {
          return await within(async (abort) => {
            const response = await fetcher(url, { ...init, signal: abort });
            if (!response.ok) throw new Error(`Could not keep ${url}: ${response.status}`);
            return read(response);
          });
        } catch {
          if (!state.paused) tries++;
        }
      }
      return undefined;
    };

    // The Septuagint's index is written at deploy, so a run that keeps the Septuagint reads it afresh (no HTTP cache; the worker answers it network first and keeps it): it names the chapters and their fingerprints.
    // One that cannot be had leaves the Septuagint with no chapters and its index address among the files to try again.
    let lxx = deps.lxx;
    let fetchedIndex = false;
    if (!lxx && keepsSeptuagint(scope)) {
      const text = await attempt(LXX_INDEX_URL, async (response) => {
        const body = await response.arrayBuffer();
        state.bytes += body.byteLength;
        return new TextDecoder().decode(body);
      }, { cache: 'no-cache' });
      try {
        const parsed = text === undefined ? undefined : (JSON.parse(text) as Partial<LxxIndex> | null);
        lxx = Array.isArray(parsed?.books) ? (parsed as LxxIndex) : undefined;
        fetchedIndex = lxx !== undefined;
      } catch {
        lxx = undefined;
      }
    }
    if (signal?.aborted) {
      report(state);
      return current;
    }
    const urls = offlineUrls(scope, index, sermons, lxx ?? null);
    state.total = urls.length;
    state.chapters = urls.filter((url) => CHAPTER_ADDRESS.test(url)).length;
    const cache = urls.length && caches ? await caches.open(DATA_CACHE) : undefined;
    const todo: string[] = [];
    const chapterMissing = cache ? (await Promise.all(urls.filter((url) => CHAPTER_ADDRESS.test(url)).map((url) => cache.match(url)))).some((hit) => !hit) : true;
    // What is kept is not fetched again. The Septuagint's index was just fetched (a test that gives it leaves it to the cache as any file); its lexicon has no fingerprint, so a cached copy cannot be told
    // from a stale one: it is fetched again only when a chapter is, because it changes with them.
    const isKept = async (url: string): Promise<boolean> => {
      if (url === LXX_INDEX_URL && !deps.lxx) return fetchedIndex;
      if (url === LXX_LEXICON_URL && chapterMissing) return false;
      return Boolean(cache && (await cache.match(url)));
    };
    for (const url of urls) {
      if (await isKept(url)) state.done++;
      else todo.push(url);
    }
    report(state);

    const keep = async (url: string): Promise<number | undefined> =>
      attempt(url, async (response) => (await response.arrayBuffer()).byteLength, url === LXX_INDEX_URL || url === LXX_LEXICON_URL ? { cache: 'no-cache' } : {});
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
