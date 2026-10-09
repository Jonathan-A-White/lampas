// src/ui/sheetBack.ts — the phone's Back on an open bottom sheet closes the sheet, as Done does, and leaves him on the screen
// beneath (mw-5r3p30.55). Every sheet calls useSheetBack(onClose) (the word, Grammar and Talk sheets; features/sheet-back.feature).
//
// A sheet that opens pushes one history entry at the same address, marked in history.state.sheet with its depth (1 for the
// first sheet, 2 for a sheet over it). Back pops that entry and a popstate to a shallower depth closes the sheet. A sheet that
// closes any other way (Done, a swipe down, a tap outside, Escape) takes its entry off again with history, so the next Back is
// not swallowed. Sheets that close in one commit are taken off with one history.go; a sheet that opens in the commit another
// closes in (Help with this word: the word sheet closes, the Talk sheet opens) keeps the entry instead of popping and pushing.
import { useEffect, useRef, useSyncExternalStore } from 'react';

type SheetState = { sheet?: number } | null;

const depthOf = (): number => (window.history.state as SheetState)?.sheet ?? 0;

/** Sheets mounted now. */
let open = 0;
const watchers = new Set<() => void>();
const tellWatchers = (): void => watchers.forEach((w) => w());

/** True while any sheet is mounted (every sheet calls useSheetBack): the round Ask the tutor control hides itself meanwhile (src/AskTutor.tsx). */
export const useSheetOpen = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      watchers.add(listener);
      return () => void watchers.delete(listener);
    },
    () => open > 0,
  );
/** The depth to settle at once this commit's effects have run, when a sheet closed and left its entry on top. */
let settleAt: number | null = null;

function settle(): void {
  const target = settleAt;
  settleAt = null;
  if (target === null) return;
  const extra = depthOf() - target;
  if (extra > 0) window.history.go(-extra);
}

/** An entry of a sheet that is no longer open (Back from a page opened over it, or Forward to it): step over it. */
function skipStale(): void {
  if (depthOf() > open) window.history.back();
}

let guarded = false;
function guard(): void {
  if (guarded) return;
  guarded = true;
  window.addEventListener('popstate', skipStale);
}

/** Back closes this sheet (calls `onClose`); closing it by other means removes its history entry. Call once in every sheet. */
export function useSheetBack(onClose: () => void): void {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    guard();
    const top = depthOf();
    let level: number;
    if (settleAt !== null && settleAt + 1 <= top) {
      level = settleAt + 1; // the entry of a sheet that just closed is this sheet's
    } else {
      level = top + 1;
      window.history.pushState({ ...(window.history.state as object | null), sheet: level }, '', window.location.href);
    }
    if (settleAt !== null) settleAt = level;
    open += 1;
    tellWatchers();
    const onPop = () => {
      if (depthOf() < level) close.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      open -= 1;
      tellWatchers();
      if (depthOf() >= level) {
        settleAt = settleAt === null ? level - 1 : Math.min(settleAt, level - 1);
        queueMicrotask(settle);
      }
    };
  }, []);
}
