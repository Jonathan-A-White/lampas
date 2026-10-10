// src/talk/outbox.ts — the pictures waiting in the open Talk sheet's composer, for a message that does not go through its Send button: the words he
// holds to say (the Reader's and the screens' hold-to-talk) go with the pictures he has put in, as one message (mw-y3qno5.1). The sheet registers a
// taker while it is open; nothing is waiting when no sheet is.
import type { OutgoingPicture } from './pictures';

let taker: (() => OutgoingPicture[]) | null = null;

/** The open sheet says how its waiting pictures are taken; returns what takes it back. */
export function registerOutbox(take: () => OutgoingPicture[]): () => void {
  taker = take;
  return () => {
    if (taker === take) taker = null;
  };
}

/** The pictures waiting in the composer, emptying it; none when no sheet is open. */
export const takeWaitingPictures = (): OutgoingPicture[] => taker?.() ?? [];
