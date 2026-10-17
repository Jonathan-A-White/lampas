// src/data/repositories/bookRequests.ts — the requests for another grammar book (Settings > Grammar books > Ask for another book,
// src/services/bookRequests.ts): the ones that wait on the phone until the mill has them, kept as a JSON list in the settings store
// ('bookRequestsWaiting', no table), and the ones the mill took (the `requests` rows of kind 'grammar-book').
import { db, type RequestRow } from '../db';

const WAITING_KEY = 'bookRequestsWaiting';

/** The kind of a `requests` row for a book (src/services/feedback.ts GrammarBookRequest). */
export const BOOK_KIND = 'grammar-book';

/** A request that has not reached the mill yet: his words as typed, and when he asked (ms). */
export interface WaitingBook {
  id: string;
  text: string;
  queuedAt: number;
}

function parse(value: unknown): WaitingBook[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    if (!Array.isArray(list)) return [];
    return list.filter((w): w is WaitingBook => typeof w?.id === 'string' && typeof w.text === 'string' && typeof w.queuedAt === 'number');
  } catch {
    return [];
  }
}

/** The requests waiting to go, the oldest first. */
export async function listWaitingBooks(): Promise<WaitingBook[]> {
  return parse((await db.settings.get(WAITING_KEY))?.value);
}

/** Keeps `text` as waiting to go; returns it. */
export function queueBook(text: string, now = Date.now()): Promise<WaitingBook> {
  const waiting: WaitingBook = { id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, text: text.trim(), queuedAt: now };
  return db.transaction('rw', db.settings, async () => {
    await db.settings.put({ key: WAITING_KEY, value: JSON.stringify([...(await listWaitingBooks()), waiting]) });
    return waiting;
  });
}

/** Forgets a waiting request: the mill has its grist. */
export function dropWaitingBook(id: string): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    const left = (await listWaitingBooks()).filter((w) => w.id !== id);
    await db.settings.put({ key: WAITING_KEY, value: JSON.stringify(left) });
  });
}

/** The requests for a book the mill has taken, the newest first. */
export async function listAskedBooks(): Promise<RequestRow[]> {
  return (await db.requests.orderBy('sentAt').reverse().toArray()).filter((r) => r.kind === BOOK_KIND);
}
