// src/settings/offlineCopyState.ts — what the Keep on this phone row does with the offline copy (src/data/offlineCopy.ts, mw-lcv9z3g.2): choosing a scope saves it and starts the run
// in place of one going (or stops it for Nothing extra, which deletes nothing), and a phone that chose a scope before checks it again when the row first shows unless a run is going
// (refreshOfflineCopy, which the app also runs at its start: what is kept is not fetched again). The time of the check is the offline copy's own (getOfflineCheckedAt).
import { getOfflineScope, offlineUrls, refreshOfflineCopy, setOfflineScope, stopOfflineCopy, type OfflineProgress, type OfflineScope } from '../data/offlineCopy';

/** He chose `scope`: it is saved, and the copy of it starts in place of any run going; Nothing extra stops the run and deletes nothing. */
export async function chooseOfflineScope(scope: OfflineScope): Promise<void> {
  await setOfflineScope(scope);
  if (scope === 'none') stopOfflineCopy();
  else void refreshOfflineCopy({ force: true }).catch(() => undefined);
}

/** A scope chosen before (a reload): its copy is checked again unless a run is going. Returns the scope. */
export async function resumeOfflineCopy(): Promise<OfflineScope> {
  const scope = await getOfflineScope();
  if (scope !== 'none') void refreshOfflineCopy().catch(() => undefined);
  return scope;
}

const counted = new Map<OfflineScope, { files: number; chapters: number }>();

/** How many files a scope keeps, and how many of them are chapters (the Hebrew word lists of the whole Bible are files, not chapters). */
export function countsOf(scope: OfflineScope): { files: number; chapters: number } {
  let counts = counted.get(scope);
  if (!counts) {
    const urls = offlineUrls(scope);
    counts = { files: urls.length, chapters: urls.filter((url) => /\/\d+\.json\?v=/.test(url)).length };
    counted.set(scope, counts);
  }
  return counts;
}

export const OFFLINE_CHOICES: readonly (readonly [OfflineScope, string])[] = [
  ['none', 'Nothing extra'],
  ['nt', 'New Testament (34 MB)'],
  ['all', 'Whole Bible (113 MB)'],
];

/** Megabytes fetched: one decimal under 10 ('0.4 MB', '1 MB'), whole numbers above. */
export function megabytes(bytes: number): string {
  const mb = bytes / 1e6;
  return `${mb < 10 ? Number(mb.toFixed(1)) : Math.round(mb)} MB`;
}

/** The time of a check: the clock for today's, else the day and the clock. */
export function checkedAt(when: number, now: Date = new Date()): string {
  const date = new Date(when);
  const clock = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toDateString() === now.toDateString() ? clock : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${clock}`;
}

export interface Status {
  /** the line the row shows, and the line under it when there is one */
  text: string;
  note?: string;
}

/** What the row says of the copy of `scope`, given its progress (undefined until the run's first report) and the time of the last check. */
export function statusOf(scope: OfflineScope, progress: OfflineProgress | undefined, checked: number | undefined): Status | undefined {
  if (scope === 'none') return undefined;
  const { chapters } = countsOf(scope);
  if (!progress) return { text: 'Checking what is kept…' };
  const done = Math.min(progress.done, chapters);
  if (progress.done === progress.total) {
    if (progress.failed.length > 0) return { text: `Could not keep ${progress.failed.length} of ${progress.total}.`, note: 'Choose it again to try them again.' };
    return { text: checked ? `Up to date · checked ${checkedAt(checked)}` : 'Up to date' };
  }
  const count = `${done} of ${chapters} chapters · ${megabytes(progress.bytes)}`;
  return progress.paused ? { text: 'Paused: offline', note: count } : { text: count, note: 'Keep the app open' };
}
