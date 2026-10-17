// src/services/bookRequests.ts — Ask for another book (Settings > Study resources > Logos > Grammar books): the request is kept on the phone
// first (data/repositories/bookRequests.ts), then sent as a 'feedback' grist of the kind grammar-book by submitFeedback, the one sender.
// A phone that is offline, or a mill that cannot be reached, leaves it waiting; it goes when the phone is back online (the window's 'online'
// event; startBookRequests listens from the app's start and sends what waits then), or on Try again. One send runs at a time. A request is
// forgotten the moment its grist is out, so a receipt that never comes does not send it twice.
import { dropWaitingBook, listWaitingBooks, queueBook } from '../data/repositories/bookRequests';
import { buildBookRequest, submitFeedback } from './feedback';
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
        await submitFeedback(buildBookRequest(book.text), { onSent: () => void (dropping = dropWaitingBook(book.id)) });
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

/** Keeps `title` on the phone and sends it if the phone can. */
export async function askForBook(title: string): Promise<void> {
  await queueBook(title);
  await sendWaitingBooks();
}

let started = false;

/** Once: sends what waits now and again each time the phone comes back online. Called from the app's start and from Settings. */
export function startBookRequests(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => void sendWaitingBooks());
  void sendWaitingBooks();
}
