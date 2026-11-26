// tests/unit/menu-late-traversal.test.tsx — the Menu's Settings row opens Settings and leaves it open, though the host is slow to land the Menu's step Back (mw-fnvjof.17.326).
// The row closes the Menu (its history entry is taken off with history.go(-1)) and opens Settings once that traversal has landed (leaveSheetsThen, src/ui/sheetBack.ts). The wait had a
// 400 ms fallback with no regard for a traversal still on its way: on a loaded host the fallback ran first, Settings was pushed, and the late traversal then popped it back to the Reader
// (reading-plan.steps.tsx 'Settings has the same entry' failed 6 runs in 20 under load, the screen dumped was the Reader).
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { ReaderMenu } from '../../src/reader/ReaderMenu';
import { landTraversalsLate } from '../support/late-traversal';
import { afterTurns } from '../support/turns';

const READER = '/#/?b=rom&c=8';

/** Holds the thread for `ms`, as a starved host does between asking for the go and the go landing. */
function busy(ms: number): void {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    /* the host gives the test no time */
  }
}

let restore: (() => void) | undefined;
beforeEach(() => {
  window.history.replaceState(null, '', READER);
});
afterEach(() => {
  restore?.();
  restore = undefined;
  cleanup();
});

it("the Menu's Settings row leaves Settings open when the Menu's step Back lands after the fallback's 400 ms", async () => {
  const restoreLate = landTraversalsLate();
  const late = window.history.go;
  let asked = 0;
  // the go is asked, then the host is starved past the 400 ms the app waits at most; the traversal itself lands late, in turns of the task queue (tests/support/late-traversal.ts)
  window.history.go = (delta?: number): void => {
    asked += 1;
    late.call(window.history, delta);
    busy(450);
  };
  restore = () => {
    window.history.go = late;
    restoreLate();
  };
  let landed = 0;
  const onPop = () => (landed += 1);
  window.addEventListener('popstate', onPop);
  try {
    render(<ReaderMenu />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await waitFor(() => expect(window.history.state?.sheet).toBe(1));
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(asked).toBe(1));
    // the Menu's traversal lands (and, were Settings under it, the app's step over the stale entry beneath)
    await waitFor(() => expect(landed).toBeGreaterThan(0));
    await afterTurns();
    expect(window.location.hash).toBe('#/settings');
  } finally {
    window.removeEventListener('popstate', onPop);
  }
});
