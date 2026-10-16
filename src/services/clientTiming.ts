// src/services/clientTiming.ts — the phone's part of every tutor answer's round trip (docs/ask-tutor.md 'How long an answer takes'). askGrind notes the
// times it saw (the tap, the request accepted, the answer delivered on the backend and seen by a poll, and the network inside them); the screen that
// draws the answer calls answerDrawn(txid); that keeps the split on the device. The NEXT grist carries it to the mill as `client_timing` (millwright's
// docs/grist-client-timing.md: milliseconds, 0 to 600000, about the previous answered grist) and Settings > About shows the last answer's split.
// A grist that failed, was abandoned or never drawn keeps nothing, so no client_timing is ever sent for it.

/** What the mill takes (docs/grist-client-timing.md): every field but the txid is optional. */
export interface ClientTiming {
  txid: string;
  /** the tap (or the end of the recording) to the request accepted by the backend, upload included */
  tap_to_sent: number;
  /** the answer delivered on the backend (its record's firstSeen) to the poll that saw it; missing when the record named no time */
  delivered_to_seen?: number;
  /** the answer seen to drawn on screen */
  seen_to_shown: number;
  /** the round trips of the requests that sent the grist plus the poll that saw the answer: inside tap_to_sent and delivered_to_seen */
  network?: number;
  /** the poll's round trip alone: delivered_to_seen less this is the wait between checks */
  poll_network?: number;
}

/** What the phone keeps of the last answer: its timing, tap to drawn in all, and whether a grist has carried it to the mill. */
export interface LastAnswer {
  timing: ClientTiming;
  total: number;
  reported: boolean;
}

export const LAST_ANSWER_KEY = 'lampas.lastAnswerTiming';

/** The most the mill takes of one number (ten minutes). */
export const MAX_TIMING_MS = 600_000;

const ms = (value: number): number => Math.min(MAX_TIMING_MS, Math.max(0, Math.round(value)));

function read(): LastAnswer | undefined {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAST_ANSWER_KEY) ?? 'null') as Partial<LastAnswer> | null;
    const t = parsed?.timing;
    if (!t || typeof t.txid !== 'string' || typeof t.tap_to_sent !== 'number' || typeof t.seen_to_shown !== 'number' || typeof parsed?.total !== 'number') return undefined;
    return { timing: t, total: parsed.total, reported: parsed.reported === true };
  } catch {
    return undefined;
  }
}

function write(last: LastAnswer): void {
  try {
    window.localStorage.setItem(LAST_ANSWER_KEY, JSON.stringify(last));
  } catch {
    // a full or blocked store loses a measurement, never an answer
  }
}

export function lastAnswer(): LastAnswer | undefined {
  return read();
}

/** The last answer's timing, for the next grist to carry, or undefined when there is none or one has carried it. It is marked as carried now (two grists in
 * flight must not both send it); `release` undoes that when the grist never reached the backend. */
export function claimReport(): ClientTiming | undefined {
  const last = read();
  if (!last || last.reported) return undefined;
  write({ ...last, reported: true });
  return last.timing;
}

export function releaseReport(txid: string): void {
  const last = read();
  if (last && last.timing.txid === txid) write({ ...last, reported: false });
}

/** What askGrind saw of one answer, in epoch milliseconds, until the screen has drawn it. */
export interface Seen {
  tapAt: number;
  sentAt: number;
  seenAt: number;
  /** the backend's time for the answer record, when it named one */
  deliveredAt?: number;
  /** the time the requests that sent the grist took */
  sendNetwork: number;
  /** the time the poll that saw the answer took */
  pollNetwork: number;
}

const waiting = new Map<string, Seen>();

/** askGrind: this answer has come; it waits to be drawn. */
export function noteAnswer(txid: string, seen: Seen): void {
  waiting.set(txid, seen);
}

/** Resolves after the browser has painted what was just rendered (two frames; a timer where there is no frame). */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') return void setTimeout(resolve, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** The screen has drawn the answer to the grist `txid` (its state is kept and rendered): its timing is finished and kept as the last answer's. Does
 * nothing for a grist askGrind did not time. Never throws. */
export async function answerDrawn(txid: string | undefined): Promise<void> {
  const seen = txid === undefined ? undefined : waiting.get(txid);
  if (txid === undefined || !seen) return;
  waiting.delete(txid);
  await afterPaint();
  const shownAt = Date.now();
  const network = seen.sendNetwork + seen.pollNetwork;
  write({
    timing: {
      txid,
      tap_to_sent: ms(seen.sentAt - seen.tapAt),
      // deliveredAt is the backend's clock and seenAt the phone's: a phone clock behind gives a negative wait (held at 0 by ms), one ahead a wait longer
      // than the answer took, so it is held to seen less sent (the answer cannot have been delivered before the request was accepted)
      ...(seen.deliveredAt === undefined ? {} : { delivered_to_seen: ms(Math.min(seen.seenAt - seen.deliveredAt, seen.seenAt - seen.sentAt)) }),
      seen_to_shown: ms(shownAt - seen.seenAt),
      ...(network > 0 ? { network: ms(network), poll_network: ms(seen.pollNetwork) } : {}),
    },
    total: ms(shownAt - seen.tapAt),
    reported: false,
  });
}

const seconds = (value: number): string => (value / 1000).toFixed(1);

/** 'Last tutor answer: 8.6 s (phone 1.3 s, network 0.7 s, waiting to see it 1.5 s, factory 5.8 s)': the phone's share is its own work (tap to sent and
 * seen to drawn), the network's is the round trips inside them, waiting is the time before a poll saw the answer, and the factory is the rest. */
export function lastAnswerLine(last: LastAnswer | undefined = read()): string | undefined {
  if (!last) return undefined;
  const { timing, total } = last;
  const poll = Math.min(timing.poll_network ?? 0, timing.delivered_to_seen ?? 0);
  const send = Math.min(Math.max(0, (timing.network ?? 0) - (timing.poll_network ?? 0)), timing.tap_to_sent);
  const phone = timing.tap_to_sent - send + timing.seen_to_shown;
  const waited = (timing.delivered_to_seen ?? 0) - poll;
  const factory = Math.max(0, total - phone - waited - send - poll);
  const parts = [`phone ${seconds(phone)} s`];
  if (timing.network !== undefined) parts.push(`network ${seconds(send + poll)} s`);
  if (timing.delivered_to_seen !== undefined) parts.push(`waiting to see it ${seconds(waited)} s`);
  parts.push(`factory ${seconds(factory)} s`);
  return `Last tutor answer: ${seconds(total)} s (${parts.join(', ')})`;
}
