// src/ideaReturn.ts — the idea sheet he left to look at a table comes back on Back (mw-svw421.5). The sheet's 'Table: <name>' opens the Paradigms screen, a page of its
// own, so the screen under the sheet (the Reader, the Goal screen) and every sheet over it are gone; before it goes, the sheet holds its idea and the address it was
// over, and IdeaReturn (src/IdeaReturn.tsx, in App) opens that idea's sheet again once Back has brought him to that address. Module state, like review/practise.ts: a
// reload drops it and he is on the screen with no sheet. The hold is dropped when he goes anywhere but the table or back to that address.
import { useSyncExternalStore } from 'react';

interface Hold {
  ideaId: string;
  /** the address the sheet was over */
  hash: string;
  /** how far the sheet's text was scrolled, so it comes back where he tapped the table */
  scrollTop: number;
}

let held: Hold | undefined;
const watchers = new Set<() => void>();
const tell = (): void => watchers.forEach((w) => w());

/** The idea sheet is about to be left for a table: remember its idea, where it stood and how far its text was scrolled. */
export function holdIdea(ideaId: string, scrollTop = 0): void {
  held = { ideaId, hash: window.location.hash, scrollTop };
  tell();
}

/** How far the held sheet's text was scrolled (0 when nothing is held). */
export function heldScrollTop(): number {
  return held?.scrollTop ?? 0;
}

/** He is done with it: the sheet was closed, or he went somewhere else. */
export function dropHeldIdea(): void {
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
 * The idea whose sheet is to come back: held, and he is at the address it was over with no sheet entry of the old screen left to step over (sheetBack.ts
 * skipStale walks Back past them one popstate at a time). Null otherwise.
 */
export function useReturnedIdea(): string | null {
  const key = useSyncExternalStore(subscribe, () => `${held?.ideaId ?? ''}|${held?.hash ?? ''}|${window.location.hash}|${sheetDepth()}`);
  const [ideaId, hash, here, depth] = key.split('|');
  if (!ideaId) return null;
  if (here === hash) return depth === '0' ? ideaId : null;
  return null;
}

/** Whether the hold still has a reason to stay: he is at the table, at a Hard sounds lesson the sheet opened (mw-5r3p30.361), or at the address it was over. */
export function holdStillWanted(): boolean {
  return held === undefined || window.location.hash === held.hash || window.location.hash.startsWith('#/paradigms') || window.location.hash.startsWith('#/sounds');
}
