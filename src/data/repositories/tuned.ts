// src/data/repositories/tuned.ts — the record of the nightly tutor-weights run (mw-t3xu9a.8, docs/ask-tutor.md 'How the tutor learns what to carry'): the date of the last run, how many up-front
// lists it changed and the reasons it gave. One row in the settings table; the run reads it to know it ran today, About reads it for the line 'Tutor tuned <date>: N changes'.
import { db } from '../db';

export const TUNED_KEY = 'tutorTuned';

/** At most this many reasons are kept, each cut to REASON_CHARS: what About lists under the line. */
export const REASONS_KEPT = 10;
export const REASON_CHARS = 300;

/** The last run: its local date (YYYY-MM-DD), when its report was made (ms since the epoch; the next report is since this), how many screens' lists it changed, why, and how many misses it forwarded. */
export interface Tuned {
  date: string;
  at: number;
  changes: number;
  reasons: string[];
  forwarded: number;
}

const whole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** The last run, or undefined before the first (and for a row that is not one). */
export async function getTuned(): Promise<Tuned | undefined> {
  const raw = (await db.settings.get(TUNED_KEY))?.value;
  let value: unknown;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
  if (typeof value !== 'object' || value === null) return undefined;
  const run = value as Record<string, unknown>;
  if (typeof run.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(run.date) || !whole(run.at) || !whole(run.changes) || !Array.isArray(run.reasons)) return undefined;
  return {
    date: run.date,
    at: run.at,
    changes: run.changes,
    reasons: run.reasons.filter((r): r is string => typeof r === 'string' && r.length > 0).slice(0, REASONS_KEPT),
    forwarded: whole(run.forwarded) ? run.forwarded : 0,
  };
}

/** Keeps `run` as the last run. */
export async function keepTuned(run: Tuned): Promise<void> {
  const kept: Tuned = { ...run, reasons: run.reasons.slice(0, REASONS_KEPT).map((r) => r.slice(0, REASON_CHARS)) };
  await db.settings.put({ key: TUNED_KEY, value: JSON.stringify(kept) });
}
