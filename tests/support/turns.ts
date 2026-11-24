// tests/support/turns.ts — let the work already queued run, counted in turns of the task queue, not in milliseconds (mw-fnvjof.17.271).
// A test that must see that NOTHING happened (a chip not drawn, a voice not heard) has no event to wait on; a sleep of 50 ms was a guess at how long the
// work would take, and a loaded host outruns it either way. A turn of the task queue is the unit the work itself moves in (a promise chain, a fake-indexeddb
// request, a React render scheduled outside act each take one or a few), so a count of turns is the same on a quiet host and a loaded one.
// Where the test can await the very read the screen makes (mapsFor, talkSermonsFor, getTips), it does that first and uses this only to let React draw what it found (a screen test wraps it: `await act(async () => { await afterTurns(); })`).
/** One turn of the task queue: everything queued as a task before this call has run when it resolves, and every promise reaction after each. */
export const oneTurn = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * `turns` turns of the task queue, one after another: enough for a chain of reads over fake-indexeddb to run to its end.
 * It is a COUNT, not a wait for the work: a chain of more than `turns` turns is not finished when it returns (tests/unit/turns.test.ts holds a chain of 40 against the default 30).
 * Where a test knows what the finished work looks like, `untilTurns` waits for that instead.
 */
export async function afterTurns(turns = 30): Promise<void> {
  for (let i = 0; i < turns; i++) await oneTurn();
}

/** Turns of the task queue until `done()` is true, at most `limit` (default 1000): the work's own end, not a guess at its length. Throws, naming the limit, when the work is not done by then. */
export async function untilTurns(done: () => boolean, limit = 1000): Promise<void> {
  for (let i = 0; i < limit; i++) {
    if (done()) return;
    await oneTurn();
  }
  if (!done()) throw new Error(`untilTurns: not done after ${limit} turns`);
}
