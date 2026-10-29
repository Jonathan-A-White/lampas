import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { chapterUrl, type BookIndex } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import {
  getOfflineCheckedAt,
  offlineUrls,
  refreshOfflineCopy,
  setOfflineScope,
  startOfflineCopy,
  updateChecked,
} from '../../src/data/offlineCopy';

// The kept copy stays current (mw-lcv9z3g.3): at app start and after each update check the kept scope is compared with index.json's fingerprints, and what the
// data cache lacks (a changed fingerprint is a missing address) is fetched; the worker's serveChapter drops the older copy. The time of the check is kept.

const OLD: BookIndex = { books: BOOK_INDEX.books.slice(0, 2) };
const bump = (fingerprint: string): string => (fingerprint.startsWith('f') ? '0' : 'f') + fingerprint.slice(1);
/** OLD with the fingerprints of John 1 (book 0 here is whichever comes first) and of the second book's chapter 1 changed. */
const NEW: BookIndex = {
  books: OLD.books.map((b, i) => (i === 0 ? { ...b, fingerprints: b.fingerprints.map((f, n) => (n === 0 || n === 2 ? bump(f) : f)) } : b)),
};
const changed = [chapterUrl(NEW.books[0].code, 1, NEW), chapterUrl(NEW.books[0].code, 3, NEW)];

class FakeCache {
  entries = new Set<string>();
  match = async (url: string) => (this.entries.has(url) ? new Response('kept') : undefined);
}

function setup(held: string[]) {
  const cache = new FakeCache();
  held.forEach((url) => cache.entries.add(url));
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    // like serveChapter: the new address is kept and the older one of the same chapter dropped
    const path = url.split('?')[0];
    for (const key of [...cache.entries]) if (key.split('?')[0] === path) cache.entries.delete(key);
    cache.entries.add(url);
    return new Response('body');
  }) as typeof fetch;
  const caches = { open: async () => cache as unknown as Cache };
  return { cache, calls, deps: { caches, fetcher, events: new EventTarget(), isOnline: () => true } };
}

beforeEach(async () => {
  await db.settings.clear();
});

describe('refreshOfflineCopy', () => {
  it('fetches exactly the chapters whose fingerprint changed, drops the old ones, and writes the time of the check', async () => {
    await setOfflineScope('nt');
    const s = setup(offlineUrls('nt', OLD));
    const end = await refreshOfflineCopy({ ...s.deps, index: NEW, now: () => 1_700_000_000_000 });
    expect([...s.calls].sort()).toEqual([...changed].sort());
    expect(end?.failed).toEqual([]);
    expect(offlineUrls('nt', NEW).every((url) => s.cache.entries.has(url))).toBe(true);
    expect(s.cache.entries.size).toBe(offlineUrls('nt', OLD).length);
    expect(await getOfflineCheckedAt()).toBe(1_700_000_000_000);
  });

  it('fetches nothing when no fingerprint changed, and still writes the time', async () => {
    await setOfflineScope('nt');
    const s = setup(offlineUrls('nt', OLD));
    await refreshOfflineCopy({ ...s.deps, index: OLD, now: () => 42 });
    expect(s.calls).toEqual([]);
    expect(await getOfflineCheckedAt()).toBe(42);
  });

  it('does nothing, and writes no time, when no scope is kept', async () => {
    const s = setup([]);
    expect(await refreshOfflineCopy({ ...s.deps, index: NEW, now: () => 7 })).toBeUndefined();
    expect(s.calls).toEqual([]);
    expect(await getOfflineCheckedAt()).toBeUndefined();
  });

  it('leaves a run that is going alone: its check is not restarted', async () => {
    await setOfflineScope('nt');
    const s = setup([]);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const slow = (async (input: RequestInfo | URL) => {
      await held;
      return s.deps.fetcher(input);
    }) as typeof fetch;
    const first = startOfflineCopy({ ...s.deps, fetcher: slow, index: { books: OLD.books.slice(0, 1) } });
    expect(await refreshOfflineCopy({ ...s.deps, index: NEW, now: () => 9 })).toBeUndefined();
    release();
    await first;
    expect(await getOfflineCheckedAt()).toBeUndefined();
  });
});

describe('updateChecked (the callback of the update check)', () => {
  const fake = () => {
    const registration = {
      waiting: null as unknown,
      installing: null as unknown,
      update: vi.fn<() => Promise<unknown>>(async () => 'checked'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    return registration as typeof registration & Parameters<typeof updateChecked>[0];
  };

  it('calls back once each check has ended, and passes the answer of the check on', async () => {
    const registration = fake();
    const onChecked = vi.fn();
    const wrapped = updateChecked(registration, onChecked);
    expect(onChecked).not.toHaveBeenCalled();
    expect(await wrapped.update()).toBe('checked');
    expect(onChecked).toHaveBeenCalledTimes(1);
    await wrapped.update();
    expect(onChecked).toHaveBeenCalledTimes(2);
  });

  it('does not call back when the check failed (offline), and the failure still reaches pwa-kit', async () => {
    const registration = fake();
    registration.update.mockRejectedValue(new Error('offline'));
    const onChecked = vi.fn();
    await expect(updateChecked(registration, onChecked).update()).rejects.toThrow('offline');
    expect(onChecked).not.toHaveBeenCalled();
  });

  it('reads the registration live: a worker that starts waiting later shows, and listeners go to the real one', () => {
    const registration = fake();
    const wrapped = updateChecked(registration, vi.fn());
    expect(wrapped.waiting).toBeNull();
    const worker = { state: 'installed' as const, postMessage: vi.fn(), addEventListener: vi.fn() };
    registration.waiting = worker;
    expect(wrapped.waiting).toBe(worker);
    const listener = vi.fn();
    wrapped.addEventListener('updatefound', listener);
    expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', listener);
    wrapped.removeEventListener('updatefound', listener);
    expect(registration.removeEventListener).toHaveBeenCalledWith('updatefound', listener);
  });
});
