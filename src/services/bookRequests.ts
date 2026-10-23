// src/services/bookRequests.ts — Ask for a book (src/library/AskForBook.tsx): the request is kept on the phone first (data/repositories/bookRequests.ts), then sent as a 'feedback' grist of the kind book by
// submitFeedback, the one sender. A phone that is offline, or a mill that cannot be reached, leaves it waiting; it goes when the phone is back online (the window's 'online' event; startBookRequests listens
// from the app's start and sends what waits then), or on Try again. One send runs at a time. A request is forgotten the moment its grist is out, so a receipt that never comes does not send it twice.
// Here too is the flood control (docs/design/library-at-scale.md 6.2): a book already in the catalogue or already asked is refused with its line, and the one library request an import may send
// (Ask the makers about these: the counts and library.csv) is refused until the catalogue version changes or 30 days pass.
import {
  askedBefore,
  dropWaitingBook,
  keepLibraryAsked,
  libraryAsked,
  listWaitingBooks,
  queueBook,
  squashTitle,
  type BookAsk,
  type LibraryAsked,
  type WaitingBook,
} from '../data/repositories/bookRequests';
import { CATALOGUE, CATALOGUE_VERSION } from '../resources/catalogue';
import { countsByType, libraryCsv, usableRows, type ListedRow } from '../library/usableRows';
import { buildBookRequest, buildLibraryRequest, submitFeedback } from './feedback';
import type { MillFile } from './mill';
import { TutorError, type TutorFailure } from './tutor';

export interface BookSending {
  /** a send is running */
  sending: boolean;
  /** why the last send left a request waiting; null when nothing is wrong */
  problem: { failure: TutorFailure; detail: string } | null;
}

let state: BookSending = { sending: false, problem: null };
const listeners = new Set<() => void>();

function set(next: BookSending): void {
  state = next;
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore. */
export const subscribeBookSending = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const bookSending = (): BookSending => state;

const phoneIsOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

async function sendWaiting(): Promise<void> {
  if (phoneIsOffline()) return;
  const waiting = await listWaitingBooks();
  if (waiting.length === 0) {
    if (state.problem) set({ ...state, problem: null });
    return;
  }
  set({ sending: true, problem: null });
  try {
    for (const book of waiting) {
      let dropping: Promise<void> | undefined;
      try {
        await submitFeedback(buildBookRequest(book), { onSent: () => void (dropping = dropWaitingBook(book.id)) });
      } catch (err) {
        await dropping;
        // the grist went and only its receipt failed: the request is the factory's, not waiting
        if (dropping) continue;
        const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
        set({ sending: false, problem: { failure: error.failure, detail: error.message } });
        return;
      }
      await dropping;
    }
    set({ sending: false, problem: null });
  } finally {
    if (state.sending) set({ ...state, sending: false });
  }
}

let chain: Promise<void> = Promise.resolve();

/** Sends every request that waits, one send at a time. Never throws: a request that could not go stays waiting and `problem` says why. */
export function sendWaitingBooks(): Promise<void> {
  chain = chain.then(sendWaiting, sendWaiting).catch(() => undefined);
  return chain;
}

/** Keeps `ask` on the phone and sends it if the phone can; returns the request kept (it is still waiting if `listWaitingBooks` holds its id). */
export async function askForBook(ask: BookAsk): Promise<WaitingBook> {
  const kept = await queueBook(ask);
  await sendWaitingBooks();
  return kept;
}

/** A day as the Library card says it: '21 Oct'. */
export const dayLine = (at: number): string => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** What the catalogue calls a title: lower case, no marks, quotes or spaces, for a book's title, short name and 'author, title'. */
const catalogued = (): Map<string, string> => {
  const names = new Map<string, string>();
  for (const e of CATALOGUE) for (const name of [e.title, e.short, e.author ? `${e.author}, ${e.title}` : '']) if (squashTitle(name) !== '') names.set(squashTitle(name), e.resource);
  return names;
};
let names: Map<string, string> | undefined;

/** The line that refuses a book the catalogue already lists, which he turns On in the Library. */
export const IN_CATALOGUE_LINE = 'Lampas opens this one: turn it On';

/** The line that refuses a book already asked: when, and where its answer comes back. */
export const askedLineOf = (at: number): string => `You asked for this on ${dayLine(at)}. Your requests follows it.`;

/** The line that refuses a book, or undefined when it may be asked: it is already in the catalogue, or already asked (kept, or still waiting to go). */
export async function bookRefusal(ask: BookAsk): Promise<string | undefined> {
  names ??= catalogued();
  if ((ask.resource && CATALOGUE.some((e) => e.resource === ask.resource)) || names.has(squashTitle(ask.title))) return IN_CATALOGUE_LINE;
  const before = await askedBefore(ask);
  return before ? askedLineOf(before.at) : undefined;
}

/** The days after which the whole list may be asked about again. */
export const LIBRARY_ASK_DAYS = 30;

/** What the card says once the library request has gone: when and how many books it named. */
export const askedLine = (note: LibraryAsked): string => `Asked on ${dayLine(note.at)}: ${note.books.toLocaleString('en')} ${note.books === 1 ? 'book' : 'books'}. The makers add what fits with each update.`;

/** The card's line when the library request cannot go again yet: the catalogue is the version it was sent under and fewer than 30 days have passed. Undefined when it may go. */
export async function libraryRefusal(now = Date.now()): Promise<string | undefined> {
  const note = await libraryAsked();
  if (!note || note.version !== CATALOGUE_VERSION) return undefined;
  return now - note.at < LIBRARY_ASK_DAYS * 24 * 60 * 60 * 1000 ? askedLine(note) : undefined;
}

/** Sends the one library request of an import: `rows` are the books of his list that Lampas does not open, `books` how many the whole list has. The counts are of every row; the usable ones go as
 * library.csv. Refuses with the card's line while the last one stands. Throws a TutorError when it could not go; the note of the send is kept only once the mill has it. */
export async function askAboutLibrary(rows: readonly ListedRow[], books: number, now = Date.now()): Promise<{ ok: true; note: LibraryAsked } | { ok: false; line: string }> {
  const refusal = await libraryRefusal(now);
  if (refusal) return { ok: false, line: refusal };
  const usable = usableRows(rows);
  if (usable.length === 0) return { ok: false, line: 'None of these books is one the makers could add.' };
  const file: MillFile = { bytes: new TextEncoder().encode(libraryCsv(usable)), mime: 'text/csv', name: 'library.csv' };
  await submitFeedback(buildLibraryRequest({ books, usable: usable.length, counts: countsByType(rows), version: CATALOGUE_VERSION }), { files: [file] });
  const note: LibraryAsked = { at: now, version: CATALOGUE_VERSION, books: usable.length };
  await keepLibraryAsked(note);
  return { ok: true, note };
}

let started = false;

/** Once: sends what waits now and again each time the phone comes back online. Called from the app's start and from Settings. */
export function startBookRequests(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => void sendWaitingBooks());
  void sendWaitingBooks();
}
