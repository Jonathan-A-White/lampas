// src/data/repositories/tips.ts — the tips he was shown (src/tips/): one row per tip id, open while its card is up. The ids go to the tips
// grind as `shown`; an open row is the card that comes back until he answers it.
import { db, type TipRow } from '../db';
import { dayOf } from './usage';

export type { TipRow };

/** The ids of every tip ever shown (open, acted on or dismissed). */
export async function shownTipIds(): Promise<string[]> {
  return db.tips.orderBy('id').keys() as Promise<string[]>;
}

/** The tip whose card is up now, if any. */
export async function openTip(): Promise<TipRow | undefined> {
  return db.tips.where('status').equals('open').first();
}

/** Keeps `tip` as shown today with its card open; false (and nothing kept) when that id was shown before. */
export async function keepTip(tip: Pick<TipRow, 'id' | 'title' | 'body' | 'action'>, now = Date.now()): Promise<boolean> {
  return db.transaction('rw', db.tips, async () => {
    if (await db.tips.get(tip.id)) return false;
    await db.tips.put({ ...tip, day: dayOf(now), status: 'open' });
    return true;
  });
}

/** Closes the card of `id`: he acted on it (Show me) or put it away (Not now, Got it). The row stays, so the id is never offered again. */
export async function dismissTip(id: string, how: 'acted' | 'dismissed'): Promise<void> {
  await db.tips.update(id, { status: how });
}
