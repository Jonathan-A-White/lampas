// src/data/repositories/bookRequests.ts — the requests for a book (Ask for a book, src/library/AskForBook.tsx, src/services/bookRequests.ts): the ones that wait on the phone until the mill has them, kept
// as a JSON list in the settings store ('bookRequestsWaiting', no table), the ones the mill took (the `requests` rows of kind 'book'; older phones also hold 'grammar-book' and 'devotional' rows from the
// boxes this replaced), whether a book was asked before, and the note of the one library request an import may send (meta 'libraryAsked').
import type { Kind } from '../../resources/catalogue';
import { db, type RequestRow } from '../db';

const WAITING_KEY = 'bookRequestsWaiting';
const LIBRARY_KEY = 'libraryAsked';

/** The kind of a `requests` row for a book (src/services/feedback.ts BookRequest). */
export const BOOK_KIND = 'book';
/** The kinds of row that were an ask for a book: the old boxes' as well as this one's. */
const ASKED_KINDS: readonly string[] = [BOOK_KIND, 'grammar-book', 'devotional'];

/** What he asks for: a title, and from a pick of his Logos list the row's details; the kind of book he wants and why, when he said. */
export interface BookAsk {
  title: string;
  resource?: string;
  type?: string;
  series?: string;
  refs?: string;
  kindWanted?: Kind;
  why?: string;
}

/** A request that has not reached the mill yet, and when he asked (ms). */
export interface WaitingBook extends BookAsk {
  id: string;
  queuedAt: number;
}

const FIELDS = ['resource', 'type', 'series', 'refs', 'kindWanted', 'why'] as const;

function parse(value: unknown): WaitingBook[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    if (!Array.isArray(list)) return [];
    return list.flatMap((w): WaitingBook[] => {
      // the old Ask for another book kept its title as `text`
      const title: unknown = w?.title ?? w?.text;
      if (typeof w?.id !== 'string' || typeof title !== 'string' || typeof w.queuedAt !== 'number') return [];
      const kept: WaitingBook = { id: w.id, title, queuedAt: w.queuedAt };
      for (const field of FIELDS) if (typeof w[field] === 'string' && w[field] !== '') (kept as unknown as Record<string, string>)[field] = w[field];
      return [kept];
    });
  } catch {
    return [];
  }
}

/** The requests waiting to go, the oldest first. */
export async function listWaitingBooks(): Promise<WaitingBook[]> {
  return parse((await db.settings.get(WAITING_KEY))?.value);
}

/** Keeps `ask` as waiting to go; returns it. */
export function queueBook(ask: BookAsk, now = Date.now()): Promise<WaitingBook> {
  const waiting: WaitingBook = { id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title: ask.title.trim(), queuedAt: now };
  for (const field of FIELDS) {
    const value = ask[field]?.trim();
    if (value) (waiting as unknown as Record<string, string>)[field] = value;
  }
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

/** A title as two asks are compared: lower case, no marks, quotes or spaces ('Faith’s  Checkbook.' is 'faithscheckbook'). */
export const squashTitle = (title: string): string => title.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** When this book was asked before, if it was: by the Resource ID when both have one, else by the title. The asks the mill took (any kind of box that asked for a book) and the ones still waiting count. */
export async function askedBefore(ask: BookAsk): Promise<{ at: number } | undefined> {
  const [sent, waiting] = await Promise.all([db.requests.orderBy('sentAt').reverse().toArray(), listWaitingBooks()]);
  const same = (resource: string | undefined, title: string | undefined): boolean =>
    ask.resource && resource ? ask.resource === resource : title !== undefined && squashTitle(title) !== '' && squashTitle(title) === squashTitle(ask.title);
  const found = sent.find((r) => ASKED_KINDS.includes(r.kind) && same(r.resource, r.text));
  if (found) return { at: found.sentAt };
  const queued = waiting.find((w) => same(w.resource, w.title));
  return queued ? { at: queued.queuedAt } : undefined;
}

/** The note of the library request that went: when, under which catalogue version, and how many books it named (the rows of library.csv). */
export interface LibraryAsked {
  at: number;
  version: string;
  books: number;
}

/** The library request he sent, undefined while he has sent none. */
export async function libraryAsked(): Promise<LibraryAsked | undefined> {
  const raw = (await db.meta.get(LIBRARY_KEY))?.value;
  if (typeof raw !== 'string') return undefined;
  try {
    const note = JSON.parse(raw) as Partial<LibraryAsked>;
    if (typeof note.at === 'number' && typeof note.version === 'string' && typeof note.books === 'number') return { at: note.at, version: note.version, books: note.books };
  } catch {
    // unreadable: as if none was sent
  }
  return undefined;
}

/** Keeps the note of the library request that went. */
export async function keepLibraryAsked(note: LibraryAsked): Promise<void> {
  await db.meta.put({ key: LIBRARY_KEY, value: JSON.stringify(note) });
}
