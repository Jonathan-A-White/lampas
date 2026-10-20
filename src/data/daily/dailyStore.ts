// src/data/daily/dailyStore.ts — what Today remembers (mw-1fwagb.5): per LOCAL date, the pieces he ticked himself and the pieces whose link he opened (the opened list is
// for the later stories that count days), and whether the 'what Today could hold' explanation has been shown and then answered. One JSON object in the settings
// store under 'dailyDone' (like readingPlan.ts), outside the settings registry; no Dexie version. A date is 'YYYY-MM-DD' on the phone's clock, never the UTC one, so
// a new local date starts empty. A piece is 'review', 'plan', 'devotional' or a passage ('psa.5', 'pro.5'). Nothing ticks by itself: only setTicked writes a tick.
import { db } from '../db';
import { anotherDevotional } from './devotionals';

const KEY = 'dailyDone';
const EXPLAINED_KEY = 'todayExplained';

/** How many dates are kept; the oldest are let go. */
export const KEPT_DAYS = 90;

/** The keys of Settings > Daily (src/settings/definitions/daily.ts). Changing any of them answers the explanation. */
export const DAILY_KEYS: readonly string[] = ['dailyReview', 'dailyPlan', 'dailyPsalms', 'dailyDevotional', 'devotional', 'devotionalDraw', 'dailyTicks'];

export interface DayRecord {
  /** the pieces he ticked, in the order he ticked them */
  ticked: string[];
  /** the pieces whose link he tapped, in the order he did */
  opened: string[];
  /** the devotional Another drew for the day (a Logos id), only while one was; it counts only while Which devotional is Random */
  devotional?: string;
}

const two = (n: number): string => String(n).padStart(2, '0');

/** The date on the phone's clock as 'YYYY-MM-DD'. */
export const localDate = (date: Date): string => `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

async function read(): Promise<Record<string, DayRecord>> {
  const row = await db.settings.get(KEY);
  if (typeof row?.value !== 'string') return {};
  try {
    const kept: unknown = JSON.parse(row.value);
    if (typeof kept !== 'object' || kept === null || Array.isArray(kept)) return {};
    const days: Record<string, DayRecord> = {};
    for (const [date, day] of Object.entries(kept)) {
      const { ticked, opened, devotional } = (day ?? {}) as Partial<DayRecord>;
      days[date] = { ticked: strings(ticked), opened: strings(opened), ...(typeof devotional === 'string' && devotional !== '' ? { devotional } : {}) };
    }
    return days;
  } catch {
    return {};
  }
}

/** Puts `change` to the record of `date` and keeps only the latest dates. */
function update(date: string, change: (day: DayRecord) => DayRecord): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    const days = await read();
    days[date] = change(days[date] ?? { ticked: [], opened: [] });
    const kept = Object.keys(days).sort().slice(-KEPT_DAYS);
    const next: Record<string, DayRecord> = {};
    for (const d of kept) next[d] = days[d];
    await db.settings.put({ key: KEY, value: JSON.stringify(next) });
  });
}

/** What he ticked and opened on `date`; empty for a date nothing is kept for. */
export async function getDay(date: string): Promise<DayRecord> {
  return (await read())[date] ?? { ticked: [], opened: [] };
}

/** Ticks `piece` on `date`, or takes the tick away. */
export function setTicked(date: string, piece: string, on: boolean): Promise<void> {
  return update(date, (day) => ({ ...day, ticked: on ? (day.ticked.includes(piece) ? day.ticked : [...day.ticked, piece]) : day.ticked.filter((p) => p !== piece) }));
}

/** Keeps `id` as the devotional of `date` (the tutor's switch for the day and Another both end here). */
export function setDevotionalPick(date: string, id: string): Promise<void> {
  return update(date, (day) => ({ ...day, devotional: id }));
}

/** Another: draws a devotional for `date` other than `current` (from the `ticked` ones, src/data/daily/devotionals.ts anotherDevotional), keeps it for the date and returns its id.
 *  The ONE function that switches the day's devotional while Which devotional stays Random. */
export async function pickAnotherDevotional(date: string, current: string, ticked: readonly string[], random?: () => number): Promise<string> {
  const id = anotherDevotional(current, ticked, random);
  await setDevotionalPick(date, id);
  return id;
}

/** Keeps that he tapped `piece`'s link on `date` (once). It is never a tick. */
export function markOpened(date: string, piece: string): Promise<void> {
  return update(date, (day) => (day.opened.includes(piece) ? day : { ...day, opened: [...day.opened, piece] }));
}

/** Whether the explanation of what Today could hold was shown ('shown'), and then answered by a change to a Daily row ('done'); undefined before it was ever shown. */
export async function getExplained(): Promise<'shown' | 'done' | undefined> {
  const row = await db.settings.get(EXPLAINED_KEY);
  return row?.value === 'shown' || row?.value === 'done' ? row.value : undefined;
}

/** Keeps that the explanation was shown; a done one stays done. */
export function noteExplained(): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    if ((await getExplained()) === undefined) await db.settings.put({ key: EXPLAINED_KEY, value: 'shown' });
  });
}

/** A setting changed: a Daily row changed after the explanation was shown makes it done, so it is not shown again. */
export function noteDailyChange(key: string): Promise<void> {
  if (!DAILY_KEYS.includes(key)) return Promise.resolve();
  return db.transaction('rw', db.settings, async () => {
    if ((await getExplained()) === 'shown') await db.settings.put({ key: EXPLAINED_KEY, value: 'done' });
  });
}
