// src/ui/sheetBack.ts — the phone's Back on an open bottom sheet closes the sheet, as Done does, and leaves him on the screen
// beneath (mw-5r3p30.55). Every sheet calls useSheetBack(onClose) (the word, Grammar and Talk sheets; features/sheet-back.feature).
//
// A sheet that opens pushes one history entry at the same address, marked in history.state.sheet with its depth (1 for the
// first sheet, 2 for a sheet over it). Back pops that entry and a popstate to a shallower depth closes the sheet. A sheet that
// closes any other way (Done, a swipe down, a tap outside, Escape) takes its entry off again with history, so the next Back is
// not swallowed. Sheets that close in one commit are taken off with one history.go; a sheet that opens in the commit another
// closes in (Help with this word: the word sheet closes, the Talk sheet opens) keeps the entry instead of popping and pushing.
//
// A move inside a sheet (a Related term on the Grammar sheet, an example word that swaps the word sheet's content) is one Back
// step too (mw-5r3p30.239): pushSheetStep pushes one more entry, deeper than every sheet's, and keeps the way back to the content
// the sheet showed. Back to the entry before runs that undo. A move that closes the sheets above its owner (an example word tapped
// on the Grammar or idea sheet) keeps their entries; the undo brings them back and they take their entries again instead of pushing.
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

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
/** Levels of the sheets mounted now, in the order they mounted. */
const mounted: number[] = [];

/** The in-sheet moves: the entry's depth -> how to put the content back, and the levels of the sheets that closed with the move. */
const steps = new Map<number, { undo: () => void; adopt: number[] }>();
/** The levels the sheets that the next undo brings back take as their own, instead of pushing entries. */
let adopt: number[] = [];
/** A move that closes sheets leaves their entries (the sheets come back on Back) for the commit that closes them. */
let suspending = false;

/** The depth to settle at once this commit's effects have run, when a sheet closed and left its entry on top. */
let settleAt: number | null = null;

function settle(): void {
  const target = settleAt;
  settleAt = null;
  if (target === null) return;
  // the entries of moves made on the sheets that closed are about to go
  for (const depth of [...steps.keys()]) if (depth > target) steps.delete(depth);
  const extra = depthOf() - target;
  if (extra > 0) window.history.go(-extra);
}

/** An entry of a sheet that is no longer open (Back from a page opened over it, or Forward to it): step over it. */
function skipStale(): void {
  const depth = depthOf();
  if (depth > open && !steps.has(depth) && !steps.has(depth + 1)) window.history.back();
}

/** Back over a move made inside a sheet: put the content back as it was before the move. */
function undoSteps(): void {
  const depth = depthOf();
  const due = [...steps.keys()].filter((at) => at > depth).sort((a, b) => b - a);
  for (const at of due) {
    const step = steps.get(at);
    steps.delete(at);
    if (!step) continue;
    adopt = step.adopt;
    step.undo();
  }
}

let guarded = false;
function guard(): void {
  if (guarded) return;
  guarded = true;
  window.addEventListener('popstate', skipStale);
  window.addEventListener('popstate', undoSteps);
}

/**
 * One Back step for a move inside a sheet whose owner is at `ownerLevel` (what useSheetBack gave it): call it just before the
 * content changes. `undo` puts the content back as it was; Back runs it. With `closing`, the sheets mounted above the owner are
 * about to close with this move: their entries stay, and when `undo` brings them back they take those entries again.
 */
export function pushSheetStep(undo: () => void, ownerLevel: number, closing = false): void {
  adopt = []; // a Back that brought sheets back has finished by the next move
  const depth = depthOf() + 1;
  window.history.pushState({ ...(window.history.state as object | null), sheet: depth }, '', window.location.href);
  steps.set(depth, { undo, adopt: closing ? mounted.filter((level) => level > ownerLevel).sort((a, b) => a - b) : [] });
  if (closing) {
    suspending = true;
    setTimeout(() => {
      suspending = false;
    }, 0);
  }
}

/** The sheets mounted above `level`. */
export const sheetsAbove = (level: number): number => mounted.filter((at) => at > level).length;

/** Back closes this sheet (calls `onClose`); closing it by other means removes its history entry. Call once in every sheet. Gives
 * a function that reads the sheet's level, for pushSheetStep. */
export function useSheetBack(onClose: () => void): () => number {
  const close = useRef(onClose);
  const levelRef = useRef(0);
  const levelNow = useCallback(() => levelRef.current, []);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    guard();
    const top = depthOf();
    let level: number;
    if (adopt.length > 0 && adopt[0] <= top) {
      level = adopt.shift() ?? top + 1; // brought back by Back over a move: its entry is still there
    } else if (settleAt !== null && settleAt + 1 <= top) {
      level = settleAt + 1; // the entry of a sheet that just closed is this sheet's
    } else {
      level = top + 1;
      window.history.pushState({ ...(window.history.state as object | null), sheet: level }, '', window.location.href);
    }
    if (settleAt !== null) settleAt = level;
    levelRef.current = level;
    mounted.push(level);
    open += 1;
    tellWatchers();
    const onPop = () => {
      if (depthOf() < level) close.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      open -= 1;
      mounted.splice(mounted.indexOf(level), 1);
      tellWatchers();
      if (suspending) return; // closed by a move inside the owner: the entry stays for the Back that brings it back
      if (depthOf() >= level) {
        settleAt = settleAt === null ? level - 1 : Math.min(settleAt, level - 1);
        queueMicrotask(settle);
      }
    };
  }, []);
  return levelNow;
}
