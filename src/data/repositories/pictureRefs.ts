// src/data/repositories/pictureRefs.ts — the Bible references found in a shared picture, kept by the picture's fingerprint (mw-5r3p30.695, docs/ask-tutor.md
// 'Share to Lampas'). The Dexie `pictureRefs` table (v24) holds one row per picture, keyed by the SHA-256 of its bytes, so the same picture is never read by the
// find-refs grist twice: coming back to the share, or sharing it again, has its references at once. On the device only; the oldest rows go past KEPT_PICTURES.
import { db, type KeptReference, type PictureRefsRow } from '../db';

export type { PictureRefsRow };

/** How many pictures' references are kept; the oldest are dropped past this. */
export const KEPT_PICTURES = 200;

/** The fingerprint of a picture: the SHA-256 of its bytes, in hex. */
export async function fingerprintOf(picture: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await picture.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The references kept for the picture `hash` names; undefined when it was never read. */
export async function keptPictureRefs(hash: string): Promise<KeptReference[] | undefined> {
  return (await db.pictureRefs.get(hash))?.found;
}

/** Keeps the references a picture was read to have (an empty list too: a page with no reference is an answer). */
export async function keepPictureRefs(hash: string, found: KeptReference[], at = Date.now()): Promise<void> {
  await db.transaction('rw', db.pictureRefs, async () => {
    await db.pictureRefs.put({ hash, at, found });
    const over = (await db.pictureRefs.count()) - KEPT_PICTURES;
    if (over > 0) await db.pictureRefs.orderBy('at').limit(over).delete();
  });
}
