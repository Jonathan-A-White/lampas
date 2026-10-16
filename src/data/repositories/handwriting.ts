// src/data/repositories/handwriting.ts — what the phone keeps for Write it (mw-86e9r1.51), in the settings store beside the settings and outside the
// registry (the tutor cannot set them): 'penSeen' ('yes' once a pen has touched the screen; src/handwriting/penWatch.ts), 'handwritingWhy' ('seen' once
// he has met his first Write it card, which says why he writes) and 'handwritingProgress' (one JSON object, the small letter -> its WriteProgress,
// src/handwriting/progression.ts). No table, no Dexie version. A letter's writing is never its grammar level: nothing here touches grammarLevels.
import { db } from '../db';
import { handwritingSetting } from '../../settings/definitions/handwriting';
import { getSetting } from '../../settings/store';
import { afterWrite, parseProgress, type WriteProgress } from '../../handwriting/progression';

const PEN_KEY = 'penSeen';
const WHY_KEY = 'handwritingWhy';
const PROGRESS_KEY = 'handwritingProgress';

export async function getPenSeen(): Promise<boolean> {
  return (await db.settings.get(PEN_KEY))?.value === 'yes';
}

export async function markPenSeen(): Promise<void> {
  if (!(await getPenSeen())) await db.settings.put({ key: PEN_KEY, value: 'yes' });
}

/** Write it is offered: Handwriting drills On, or Automatic with a pen seen. */
export async function handwritingOn(): Promise<boolean> {
  const setting = await getSetting(handwritingSetting);
  return setting === 'on' || (setting === 'auto' && (await getPenSeen()));
}

export async function getWhySeen(): Promise<boolean> {
  return (await db.settings.get(WHY_KEY))?.value === 'seen';
}

export async function markWhySeen(): Promise<void> {
  await db.settings.put({ key: WHY_KEY, value: 'seen' });
}

async function allProgress(): Promise<Record<string, unknown>> {
  const row = await db.settings.get(PROGRESS_KEY);
  if (!row) return {};
  try {
    const value: unknown = JSON.parse(row.value);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Where a letter stands (its small form: 'ο'). */
export async function getWriteProgress(letter: string): Promise<WriteProgress> {
  return parseProgress((await allProgress())[letter]);
}

/** Keeps a check of a letter's writing and gives the progress after it. A skip is not a check: nothing calls this for one. */
export async function recordWrite(letter: string, right: boolean): Promise<WriteProgress> {
  return db.transaction('rw', db.settings, async () => {
    const all = await allProgress();
    const next = afterWrite(parseProgress(all[letter]), right);
    await db.settings.put({ key: PROGRESS_KEY, value: JSON.stringify({ ...all, [letter]: next }) });
    return next;
  });
}
