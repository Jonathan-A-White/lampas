// src/lists/deleted.ts — the list he just deleted, held for a few seconds so Undo can bring it back (mw-9q8wp1.1). One at a time: a second delete lets the first go. Kept in memory, not
// in Dexie: it is for the seconds after a tap, and a closed app has let it go.
import { useSyncExternalStore } from 'react';
import { restoreVerseList, type VerseListRow } from '../data/repositories';

/** How long Undo is offered. */
export const UNDO_MS = 8000;

let held: VerseListRow | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function release(): void {
  clearTimeout(timer);
  timer = undefined;
  held = null;
  notify();
}

/** Holds `row` for Undo for UNDO_MS. */
export function noteDeleted(row: VerseListRow): void {
  clearTimeout(timer);
  held = row;
  timer = setTimeout(release, UNDO_MS);
  notify();
}

/** Puts back the list that was deleted last, if Undo is still offered. */
export async function undoDeleted(): Promise<void> {
  const row = held;
  if (!row) return;
  release();
  await restoreVerseList(row);
}

/** The list Undo would bring back, or null. */
export function useDeleted(): VerseListRow | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => held,
  );
}
