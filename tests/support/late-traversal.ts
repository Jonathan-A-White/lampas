// tests/support/late-traversal.ts — a history traversal that lands late, as a loaded host lands it (mw-fnvjof.17.325).
// jsdom lands history.go(-n) a task later, which hides a step that does not wait for it; a step file that opens the app installs this so every traversal the app asks for lands later.
// Late is counted in turns of the task queue after the go was ASKED, never in milliseconds: a loaded host asks for the go late, so a landing 150 ms after the ask fell behind the app's
// 400 ms fallback timer (afterSheetEntryGone, src/ui/sheetBack.ts), the app's `then` ran first (Settings opened) and the traversal popped it back to the Reader (tests/unit/late-traversal.test.ts).
// Turns are no promise either: a host starved for 400 ms between the ask and the landing ran the fallback first all the same (mw-fnvjof.17.326), so the app now waits past its 400 ms
// while a go it asked for has not landed (tests/unit/menu-late-traversal.test.tsx).
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
