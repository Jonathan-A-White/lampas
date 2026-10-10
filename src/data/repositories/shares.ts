// src/data/repositories/shares.ts — the share waiting to be placed (mw-y3qno5.2): what another app sent to Lampas's share target. The service worker
// parks it (src/share/target.ts), the Share screen (src/share/ShareScreen.tsx) offers it to a talk, and Cancel or a pick takes it off again.
// Only one share waits at a time: parking a new one drops the old.
import { db, type ShareRow } from '../db';

export type { ShareRow };

/** Keeps `row` as the one waiting share. */
export async function parkShare(row: ShareRow): Promise<void> {
  await db.transaction('rw', db.shares, async () => {
    await db.shares.clear();
    await db.shares.add(row);
  });
}

/** The waiting share `id` names, or the newest when none is named; undefined when nothing waits. */
export async function waitingShare(id?: string): Promise<ShareRow | undefined> {
  return (id ? await db.shares.get(id) : undefined) ?? (await db.shares.orderBy('createdAt').last());
}

/** Drops every waiting share (Cancel, or a pick: the pictures and words are in the talk's composer then). */
export async function dropShares(): Promise<void> {
  await db.shares.clear();
}
