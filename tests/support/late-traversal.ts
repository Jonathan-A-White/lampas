// tests/support/late-traversal.ts — a history traversal that lands late, as a loaded host lands it (mw-fnvjof.17.325).
// jsdom lands history.go(-n) a task later, which hides a step that does not wait for it; a step file that opens the app installs this so every traversal the app asks for lands later.
// Late is counted in turns of the task queue after the go was ASKED, never in milliseconds: the app waits for a traversal at most 400 ms from when it set its own timer
// (afterSheetEntryGone, src/ui/sheetBack.ts), and a loaded host asks for the go late, so a landing 150 ms after the ask could fall behind that timer, the app's `then` run first
// (Settings opened) and the traversal pop it back to the Reader (tests/unit/late-traversal.test.ts).
import { afterTurns } from './turns';

/** How many turns of the task queue a traversal lands after it was asked. */
export const LATE_TRAVERSAL_TURNS = 5;

/** Makes every window.history.go land late; gives the restore. */
export function landTraversalsLate(): () => void {
  const real = window.history.go.bind(window.history);
  window.history.go = (delta?: number): void => void afterTurns(LATE_TRAVERSAL_TURNS).then(() => real(delta));
  return () => {
    window.history.go = real;
  };
}
