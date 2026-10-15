// src/gate/licenceTip.ts — when a free reader is told, once, what a licence adds (mw-8m9dyu.6, VISION.md 'Free to read, a licence for the AI'). A visit is
// an open of the app on a different local day: main.tsx calls noteVisit() before the first render. The tip is due from the third visit, on a phone the check
// says has no licence, and it is shown once ever: it first shows on one day and stays up that day until he closes it, and it is over for good when he closes it
// or taps Learn more. Kept in localStorage (read synchronously, no table).
import { dayOf } from '../data/repositories/usage';

const VISITS_KEY = 'lampas.visits';
const TIP_KEY = 'lampas.licenceTip';

/** The visit on which the tip is first due (PROVISIONAL, the Mayor's choice for the Governor to confirm). */
export const TIP_VISIT = 3;

interface Visits {
  count: number;
  last: string;
}

function readVisits(): Visits {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(VISITS_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object') {
      const { count, last } = parsed as Partial<Visits>;
      if (typeof count === 'number' && Number.isFinite(count) && typeof last === 'string') return { count, last };
    }
  } catch {
    // unreadable: counted from nothing
  }
  return { count: 0, last: '' };
}

/** Counts today as a visit unless it is already counted. Call once as the app opens. */
export function noteVisit(now = Date.now()): void {
  const day = dayOf(now);
  const visits = readVisits();
  if (visits.last === day) return;
  try {
    window.localStorage.setItem(VISITS_KEY, JSON.stringify({ count: visits.count + 1, last: day } satisfies Visits));
  } catch {
    // no storage: no visits are counted, so no tip is ever due
  }
}

/** The tip's state on this phone: not shown yet, first shown on a day, or over. */
function tipState(): string | null {
  return window.localStorage.getItem(TIP_KEY);
}

/** Whether the tip is due now: from the third visit, never after it was closed, and not on a day after the one it first showed. */
export function licenceTipDue(now = Date.now()): boolean {
  if (readVisits().count < TIP_VISIT) return false;
  const state = tipState();
  return state === null || state === dayOf(now);
}

/** Records that the tip is up today, so no later day shows it again. */
export function markLicenceTipShown(now = Date.now()): void {
  if (tipState() === null) window.localStorage.setItem(TIP_KEY, dayOf(now));
}

/** Ends the tip for good (closed, or Learn more tapped). */
export function endLicenceTip(): void {
  window.localStorage.setItem(TIP_KEY, 'done');
}
