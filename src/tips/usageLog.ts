// src/tips/usageLog.ts — keeps a count of what he does, from the bus: each event adds one to today's row for its kind, and a move to
// another screen adds one for 'screen:<route>'. Only the kind or the route is kept, never the event's payload (no verse, word or
// question). A chapter opened after another is 'chapter-changed', which tells the picker and the chapter buttons from a plain reopen.
// The summary (summary.ts) reads the rows; tips are offered from it (docs/tips.md).
import { recordUsage } from '../data/repositories';
import { subscribeAll } from '../events/bus';
import { routeOf } from '../nav/route';

/** Every log that has started, with its queue of writes; a stopped log leaves once its writes are kept. */
const logs = new Set<{ queue: Promise<void> }>();

/**
 * Resolves when every write of every log, stopped or not, is kept. App's cleanup drops the promise stop() returns, so whoever
 * must not leave a write behind (a test before it clears the tables or closes the db) waits on this.
 */
export async function usageWritesSettled(): Promise<void> {
  await Promise.all([...logs].map((log) => log.queue));
}

/**
 * A count whose write meets a closed database is dropped quietly: the db is closing (a test's teardown, or the browser closing it
 * for a newer version), so the write has nowhere to go and the count is only a tally. Any other failure is logged (mw-lcv9z3g.15).
 */
function keepFailure(error: unknown): void {
  if (error instanceof Error && error.name === 'DatabaseClosedError') return;
  console.error('could not keep the usage count', error);
}

/** Starts the log; the returned stop unsubscribes and resolves when every write is kept. `now` is for tests. */
export function startUsageLog(now: () => number = Date.now): () => Promise<void> {
  // One write at a time, in the order things happened; a failed write is logged and never stops the app.
  const log = { queue: Promise.resolve() };
  logs.add(log);
  const count = (name: string) => {
    const when = now();
    log.queue = log.queue.then(() => recordUsage(name, when)).catch(keepFailure);
  };

  let chapter: string | null = null;
  const offBus = subscribeAll((event) => {
    count(event.kind);
    if (event.kind === 'chapter-opened') {
      const here = `${event.book}.${event.chapter}`;
      if (chapter !== null && chapter !== here) count('chapter-changed');
      chapter = here;
    }
  });

  let screen: string | null = null;
  const seeScreen = () => {
    const route = routeOf(window.location.hash);
    if (route === screen) return;
    screen = route;
    count(`screen:${route}`);
  };
  seeScreen();
  window.addEventListener('hashchange', seeScreen);
  window.addEventListener('popstate', seeScreen);

  return () => {
    offBus();
    window.removeEventListener('hashchange', seeScreen);
    window.removeEventListener('popstate', seeScreen);
    return log.queue.finally(() => logs.delete(log));
  };
}
