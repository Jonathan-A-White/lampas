// src/talk/doneUndo.ts — the Undo of a command the tutor ran (mw-t3xu9a.7): a function, so it cannot be kept with the turn; it is held here, by the turn and the line, while the page lives.
// A line whose undo is gone (the page was reloaded) is kept as its said line without the Undo button, and a confirm command's button needs none: it runs the command again from its args.
import { useSyncExternalStore } from 'react';

type Undo = () => Promise<void>;

const held = new Map<string, Undo>();
const watchers = new Set<() => void>();
const keyOf = (turnId: number, index: number): string => `${turnId}:${index}`;

/** Holds the undo of line `index` of turn `turnId`. */
export function holdUndo(turnId: number, index: number, undo: Undo): void {
  held.set(keyOf(turnId, index), undo);
  watchers.forEach((w) => w());
}

/** The undo held for the line, if the page still has it. */
export const undoOf = (turnId: number, index: number): Undo | undefined => held.get(keyOf(turnId, index));

/** Lets go of the undo of a line (it was used). */
export function dropUndo(turnId: number, index: number): void {
  held.delete(keyOf(turnId, index));
  watchers.forEach((w) => w());
}

/** The line's undo, drawn again when it is held or let go. */
export const useUndo = (turnId: number | undefined, index: number): Undo | undefined =>
  useSyncExternalStore(
    (listener) => {
      watchers.add(listener);
      return () => void watchers.delete(listener);
    },
    () => (turnId === undefined ? undefined : undoOf(turnId, index)),
  );
