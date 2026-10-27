// src/review/keptRound.ts — the Review round he is in the middle of, kept in session storage so a reload, or the phone dropping the page while he is in another app,
// carries on at the next question instead of 'Due today ... Start' (mw-86e9r1.32). The items are plain data, so the round is kept whole. Dropped when the round ends,
// when the tab's session does, or after KEPT_MS.
import type { RunningRound } from './heldRound';

const KEY = 'lampas.reviewRound';

/** A round kept longer than this is not his any more: the day's due items have moved. */
export const KEPT_MS = 6 * 60 * 60 * 1000;

function store(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * Keeps the round. An answer is already on the schedule, so a question answered is not asked again: the kept round stands at the next question, unless it was
 * the last (then it stays on that answer, and Finish still ends the round). A right pick still waiting for its grade is not on the schedule: the round stays on it.
 */
export function keepRound(round: RunningRound, now = Date.now()): void {
  const answeredNotLast = round.picked !== null && !round.pending && round.index < round.items.length - 1;
  const kept: RunningRound = answeredNotLast ? { ...round, index: round.index + 1, picked: null } : round;
  try {
    store()?.setItem(KEY, JSON.stringify({ round: kept, at: now }));
  } catch {
    // Storage full or refused: the round is not kept, and a reload starts at the Start card.
  }
}

/** Lets go of it: the round ended. */
export function dropRound(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // As above.
  }
}

const isText = (v: unknown): v is string => typeof v === 'string';

/** The round kept and still his, or undefined (nothing kept, too old, or what is stored is not a round). */
export function keptRound(now = Date.now()): RunningRound | undefined {
  try {
    const saved = JSON.parse(store()?.getItem(KEY) ?? 'null') as { round?: Partial<RunningRound>; at?: unknown } | null;
    const round = saved?.round;
    if (!round || typeof saved?.at !== 'number' || now - saved.at > KEPT_MS) return undefined;
    const { items, index, picked, right, missed, outcomes } = round;
    if (!Array.isArray(items) || items.length === 0 || !items.every((i) => typeof i === 'object' && i !== null && isText((i as { kind?: unknown }).kind))) return undefined;
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= items.length) return undefined;
    if (picked !== null && !isText(picked)) return undefined;
    if (typeof right !== 'number' || !Array.isArray(missed) || !missed.every(isText)) return undefined;
    const sound = typeof outcomes === 'object' && outcomes !== null && Object.values(outcomes).every((v) => typeof v === 'boolean');
    return { status: 'running', items, index, picked, right, missed, ...(sound ? { outcomes } : {}) };
  } catch {
    return undefined;
  }
}
