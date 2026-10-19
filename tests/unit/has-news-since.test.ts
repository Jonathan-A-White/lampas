// tests/unit/has-news-since.test.ts: the judge Lampas hands pwa-kit/app-update (mw-ti1qik.4): it reads the changelog fresh
// and says whether any entry is after the running version; a changelog it cannot read rejects, so the kit offers the banner.
import { describe, expect, it } from 'vitest';
import type { ChangelogEntry } from 'pwa-kit/whats-new';
import { hasNewsSince } from '../../src/whatsNew/hasNewsSince';

const entry = (version: string): ChangelogEntry => ({ version, date: '2026-10-12', story: 'fx-1', kind: 'fixed', text: 'A line.' });

describe('hasNewsSince', () => {
  it('is false when nothing is after the running version', async () => {
    await expect(hasNewsSince(async () => [entry('0.1.120'), entry('0.1.119')])('0.1.120')).resolves.toBe(false);
  });

  it('is true when an entry is after the running version', async () => {
    await expect(hasNewsSince(async () => [entry('0.1.121'), entry('0.1.120')])('0.1.120')).resolves.toBe(true);
  });

  it('rejects when the changelog is null, so the banner is offered', async () => {
    await expect(hasNewsSince(async () => null)('0.1.120')).rejects.toThrow();
  });

  it('rejects when the read rejects', async () => {
    await expect(hasNewsSince(() => Promise.reject(new Error('offline')))('0.1.120')).rejects.toThrow('offline');
  });
});
