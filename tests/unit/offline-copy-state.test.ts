import { describe, expect, it } from 'vitest';
import { runOfflineCopy, type OfflineProgress } from '../../src/data/offlineCopy';
import { statusOf } from '../../src/settings/offlineCopyState';

// mw-lcv9z3g.10: a run stopped before its index is read (a double tap on All stops the first run at once) is not a run that finished.

const CHECKED = Date.UTC(2026, 10, 10, 15, 3);

describe('statusOf: a stopped run', () => {
  it('does not say Up to date for a run stopped before its index was read', async () => {
    const controller = new AbortController();
    controller.abort();
    const never = (async () => {
      throw new Error('a stopped run fetches nothing');
    }) as typeof fetch;
    const caches = { open: async () => ({ match: async () => undefined }) as unknown as Cache };
    const seen: OfflineProgress[] = [];
    const end = await runOfflineCopy('all', { signal: controller.signal, fetcher: never, caches, events: new EventTarget(), isOnline: () => true });
    seen.push(end);
    for (const progress of seen) {
      expect(statusOf('all', progress, undefined)?.text).toBe('Checking what is kept…');
      expect(statusOf('all', progress, CHECKED)?.text).toBe('Checking what is kept…');
    }
  });

  it('does not report a stopped run to the row at all before its total is known', async () => {
    const controller = new AbortController();
    controller.abort();
    const { onOfflineProgress } = await import('../../src/data/offlineCopy');
    const heard: OfflineProgress[] = [];
    const stop = onOfflineProgress((p) => heard.push(p));
    await runOfflineCopy('all', { signal: controller.signal, fetcher: (async () => new Response('')) as typeof fetch, events: new EventTarget(), isOnline: () => true });
    stop();
    expect(heard.filter((p) => p.total === 0)).toEqual([]);
  });

  it('still says Up to date for a finished run and the count for one under way', () => {
    const base: OfflineProgress = { scope: 'nt', chapters: 260, done: 260, total: 300, bytes: 0, failed: [], paused: false };
    expect(statusOf('nt', { ...base, done: 300 }, CHECKED)?.text).toMatch(/^Up to date · checked /);
    expect(statusOf('nt', { ...base, done: 10, bytes: 1e6 }, CHECKED)?.text).toBe('10 of 260 chapters · 1 MB');
  });
});
