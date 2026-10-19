// src/whatsNew/hasNewsSince.ts: the judge Lampas hands pwa-kit/app-update (its `hasNewsSince`): a waiting build is offered
// only if the changelog, read fresh from the server, has an entry after the running version (mw-5r3p30.236). A changelog
// that cannot be read rejects, and the kit then offers the banner as usual.
import { summarise, type ChangelogEntry } from 'pwa-kit/whats-new';

/** Reads the waiting build's changelog (pwa-kit's fetchChangelog asks with cache 'no-store'); null when it cannot be read. */
export type ReadChangelog = () => Promise<ChangelogEntry[] | null>;

export function hasNewsSince(read: ReadChangelog): (version: string) => Promise<boolean> {
  return async (version) => {
    const entries = await read();
    if (entries === null) throw new Error('The changelog could not be read');
    return summarise(entries, version) !== null;
  };
}
