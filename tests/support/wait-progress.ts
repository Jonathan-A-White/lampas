// tests/support/wait-progress.ts — a wait for a result reached in more than one move (mw-qtu3zvz.186).
// A tap that moves two dials writes them one after the other, and every write is re-read by each Settings row drawn, over fake-indexeddb: a loaded host takes the one wait
// (ASYNC_WAIT_MS) for the first move alone. A plain waitFor gives the whole choice that one wait; this gives each state it passes through its own, and fails only when a whole wait
// goes by with the screen where it was, so a drawing that has stopped still fails after one wait.
import { waitFor } from '@testing-library/react';

/**
 * Wait until `check` passes, as often as it takes while `seen` (what the screen draws, as text) is a new value at the end of each wait; the last wait's failure when it is not.
 * `timeout` is for the test of this helper only; a step passes none, and the wait is the shared ASYNC_WAIT_MS.
 */
export async function waitWhileChanging(check: () => void, seen: () => string, timeout?: number): Promise<void> {
  const options = timeout === undefined ? undefined : { timeout };
  for (;;) {
    const before = seen();
    try {
      await waitFor(check, options);
      return;
    } catch (failure) {
      if (seen() === before) throw failure;
    }
  }
}
