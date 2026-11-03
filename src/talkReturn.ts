// src/talkReturn.ts — the Talk sheet he left to look at a table the tutor linked comes back on Back (mw-5r3p30.990). The tutor's `paradigm` link opens the Paradigms screen, a page
// of its own, so the screen under the sheet (the Reader, Drill it) is gone; before it goes, the sheet's talk is held (its scope, which names the conversation) with the address it was
// over and the address of the table, and TalkReturn (src/TalkReturn.tsx, in App) opens the talk's sheet again once Back has brought him to that address. The same as
// src/wordReturn.ts: module state, so a reload drops it and he is on the screen with no sheet; the hold is dropped when he goes anywhere but the table or back to that address.
import { useSyncExternalStore } from 'react';
import type { TalkScope } from './services/talk';

export interface HeldTalk {
  scope: TalkScope;
  /** the address the sheet was over */
  hash: string;
  /** the address of the table he was sent to: the table's Back is to the talk only there */
  table: string;
}

let held: HeldTalk | undefined;
const watchers = new Set<() => void>();
const tell = (): void => watchers.forEach((w) => w());

/** The Talk sheet is about to be left for a table (`table` is its address, src/nav/route.ts paradigmHash): remember the talk and where the sheet stood. */
export function holdTalk(scope: TalkScope, table: string): void {
  held = { scope, hash: window.location.hash, table };
  tell();
}

/** The talk held now, if any. */
export const heldTalk = (): HeldTalk | undefined => held;

/** He is done with it: the sheet is back, or he went somewhere else. */
export function dropHeldTalk(): void {
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

/** The talk whose sheet is to come back: held, and he is at the address it was over with no sheet entry of the old screen left to step over (sheetBack.ts skipStale walks Back past them). Undefined otherwise. */
export function useReturnedTalk(): HeldTalk | undefined {
  useSyncExternalStore(subscribe, () => `${held?.hash ?? ''}|${window.location.hash}|${sheetDepth()}`);
  return held !== undefined && window.location.hash === held.hash && sheetDepth() === 0 ? held : undefined;
}

/** Whether the hold still has a reason to stay: he is at the table (or the Paradigms list one step on), or at the address it was over. */
export const holdTalkStillWanted = (): boolean => held === undefined || window.location.hash === held.hash || window.location.hash.startsWith('#/paradigms');

/** Whether the table he is on is the one the talk sent him to, so its Back is the talk's. */
export const tableIsFromTalk = (): boolean => held !== undefined && window.location.hash === held.table;

/** Back from the table to the talk: a step Back when the talk is held (the screen under it is as he left it), else (a reload left nothing behind) the list of tables. */
export function leaveToTalk(fallback: () => void): void {
  if (held === undefined) fallback();
  else window.history.back();
}
