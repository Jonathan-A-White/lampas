// tests/support/changelog.ts — a fixture changelog.json and a fetch that serves it, for the What's new screens
// (src/whatsNew/). The versions are worked out from the build's own, so the fixture stays right when the version moves.
import { vi } from 'vitest';
import type { ChangelogEntry } from 'bsv-kit/whats-new';
import { APP_SEMVER } from '../../src/config';

/** The version after this build's: the one a waiting update would be. */
export function nextVersion(version: string = APP_SEMVER): string {
  const parts = version.split('.');
  parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
  return parts.join('.');
}

/** An older version than this build's (for a phone that last saw it). */
export const OLDER_VERSION = '0.0.1';

export const WAITING_NEW = 'Pin a verse to the top.';
export const WAITING_FIXED = 'The chapter list no longer jumps.';
export const RUNNING_NEW = 'Seeing what is new in the app.';
export const OLDER_NEW = 'Reading the Greek aloud.';

/** Newest first: the waiting version (1 new, 1 fixed), this build's version (1 new), an old one. */
export function fixtureChangelog(): ChangelogEntry[] {
  return [
    { version: nextVersion(), date: '2026-10-12', story: 'fx-3', kind: 'new', text: WAITING_NEW },
    { version: nextVersion(), date: '2026-10-12', story: 'fx-4', kind: 'fixed', text: WAITING_FIXED },
    { version: APP_SEMVER, date: '2026-10-09', story: 'fx-2', kind: 'new', text: RUNNING_NEW },
    { version: OLDER_VERSION, date: '2026-09-01', story: 'fx-1', kind: 'new', text: OLDER_NEW },
  ];
}

/** Makes `/changelog.json` answer `entries` (or 404 for `null`); every other URL goes to the fetch that was in place. */
export function stubChangelog(entries: ChangelogEntry[] | null): void {
  const inner = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/changelog.json')) {
        return entries ? new Response(JSON.stringify(entries), { status: 200, headers: { 'Content-Type': 'application/json' } }) : new Response('not found', { status: 404 });
      }
      return inner ? inner(input, init) : new Response('not found', { status: 404 });
    }),
  );
}
