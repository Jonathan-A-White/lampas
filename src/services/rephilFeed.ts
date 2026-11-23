// src/services/rephilFeed.ts — Morning RePhil's episodes from the sermon index service (mw-r9xo1pj.24): GET /v1/rephil, asked at most once a local day and kept on the device (one JSON object under
// 'morningRephilFeed' in the settings store, outside the registry like dailyDone; no Dexie version), merged into the bundled list by morningRephil.ts so a new episode shows with no app release.
// Offline, or with no service, the kept answer stands, and with none the bundled list: nothing here ever throws. The YouTube video ids it holds are kept no longer than the day's answer is replaced (the 30-day rule of sermon-index's README).
import { localDate } from '../data/daily/dailyStore';
import { serviceEpisodes, setServiceEpisodes } from '../data/daily/morningRephil';
import { db } from '../data/db';
import { fetchRephil, sermonsServiceKnown } from './sermons';

const KEY = 'morningRephilFeed';

interface Kept {
  /** the local date the service answered on, 'YYYY-MM-DD' */
  day: string;
  /** the service's answer as it came, read again by serviceEpisodes (so a kept list from an older build cannot put a bad row in) */
  rows: unknown;
}

let loading: Promise<void> | undefined;
let triedOn: string | undefined;
let readKept = false;

/** The test seam: the next refreshEpisodes starts as a fresh page load would, and the list is the bundled one alone. */
export function forgetEpisodes(): void {
  loading = undefined;
  triedOn = undefined;
  readKept = false;
  setServiceEpisodes([]);
}

async function kept(): Promise<Kept | undefined> {
  try {
    const raw = (await db.settings.get(KEY))?.value;
    const found: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;
    if (typeof found !== 'object' || found === null) return undefined;
    const { day, rows } = found as { day?: unknown; rows?: unknown };
    return typeof day === 'string' ? { day, rows } : undefined;
  } catch {
    return undefined;
  }
}

async function run(now: Date): Promise<void> {
  const today = localDate(now);
  if (!readKept) {
    const old = await kept();
    readKept = true;
    if (old) setServiceEpisodes(serviceEpisodes(old.rows));
    if (old?.day === today) {
      triedOn = today;
      return;
    }
  }
  if (triedOn === today || !sermonsServiceKnown()) return;
  triedOn = today;
  try {
    const answer = await fetchRephil();
    const rows = serviceEpisodes(answer);
    if (rows.length === 0) return;
    setServiceEpisodes(rows);
    await db.settings.put({ key: KEY, value: JSON.stringify({ day: today, rows: answer } satisfies Kept) });
  } catch {
    // offline, or the service is down: the kept answer or the bundled list stands, and the next day asks again
  }
}

/** Reads the kept answer, then asks the service if it has not been asked today (local date), and puts what it has in the list (setServiceEpisodes). Calls that overlap share one run. Never rejects. */
export function refreshEpisodes(now: Date = new Date()): Promise<void> {
  const next = (loading ?? Promise.resolve()).then(() => run(now)).catch(() => undefined);
  loading = next;
  return next;
}
