// src/wordReturn.ts — the word sheet he left to look at the word's table comes back on Back (mw-irpgqi.1). The sheet's Paradigm row opens the Paradigms screen, a page of
// its own, so the screen under the sheet and every sheet over it are gone; before it goes, the sheet holds the word it showed and the address it was over, and WordReturn
// (src/WordReturn.tsx, in App) opens the sheet again once Back has brought him to that address. The same as src/ideaReturn.ts: module state, so a reload drops it and he is
// on the screen with no sheet; the hold is dropped when he goes anywhere but the table or back to that address.
import { useSyncExternalStore } from 'react';
import type { Chapter } from './data/chapter';
import type { Lookup } from './WordSheet';

export interface HeldWord {
  chapter: Chapter;
  lookup: Lookup;
  /** the address the sheet was over */
  hash: string;
}

let held: HeldWord | undefined;
const watchers = new Set<() => void>();
const tell = (): void => watchers.forEach((w) => w());

/** The word sheet is about to be left for the word's table: remember what it showed and where it stood. */
export function holdWord(chapter: Chapter, lookup: Lookup): void {
  held = { chapter, lookup, hash: window.location.hash };
  tell();
}

/** The word sheet held now, if any. */
export const heldWord = (): HeldWord | undefined => held;

/** He is done with it: the sheet is back, or he went somewhere else. */
export function dropHeldWord(): void {
  if (held === undefined) return;
  held = undefined;
  tell();
}

const subscribe = (listener: () => void): (() => void) => {
  watchers.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    watchers.delete(listener);
    window.removeEventListener('popstate', listener);
  };
};

const sheetDepth = (): number => (window.history.state as { sheet?: number } | null)?.sheet ?? 0;

/**
 * The word whose sheet is to come back: held, and he is at the address it was over with no sheet entry of the old screen left to step over (sheetBack.ts skipStale walks
 * Back past them one popstate at a time). Undefined otherwise.
 */
export function useReturnedWord(): HeldWord | undefined {
  useSyncExternalStore(subscribe, () => `${held?.hash ?? ''}|${window.location.hash}|${sheetDepth()}`);
  return held !== undefined && window.location.hash === held.hash && sheetDepth() === 0 ? held : undefined;
}

/** Whether the hold still has a reason to stay: he is at the table, or at the address it was over. */
export const holdWordStillWanted = (): boolean => held === undefined || window.location.hash === held.hash || window.location.hash.startsWith('#/paradigms');

/** Back from the table to the word sheet: a step Back when the sheet is held (the screen under it is as he left it), else (a reload left nothing behind) the list of tables. */
export function leaveToWord(fallback: () => void): void {
  if (held === undefined) fallback();
  else window.history.back();
}
