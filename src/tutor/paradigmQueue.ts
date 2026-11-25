// src/tutor/paradigmQueue.ts — the paradigm table a tutor answer opens (mw-5r3p30.1249): the command open-paradigm (src/tutor/registry.ts) holds the table he asked for here, and the answer
// that names it opens the Paradigms screen at it with no tap once it is done: a typed ask when the answer is kept (src/useTalk.ts), a Hands-free ask when the answer has been said (src/handsFree/ask.ts).
// The same as the sermon play-sermon holds (src/sermons/player.ts queueSermon): module state, the latest one wins, and an answer cut short or replaced drops it.
import { openParadigm } from '../nav/route';

let queued: string | null = null;

/** Holds the table `id` (a PARADIGMS id) to open once the answer is done. */
export function queueParadigm(id: string): void {
  queued = id;
}

/** The held table, forgotten: the caller opens it. Null when none was held. */
export function takeQueuedParadigm(): string | null {
  const id = queued;
  queued = null;
  return id;
}

/** Opens the held table on the Paradigms screen as a new Back step, and forgets it. False when none was held. */
export function openQueuedParadigm(): boolean {
  const table = takeQueuedParadigm();
  if (table === null) return false;
  openParadigm({ table });
  return true;
}

/** Forgets the held table without opening it (the answer was cut short, or another one came). */
export function dropQueuedParadigm(): void {
  queued = null;
}

/** Whether a table is held to open (tests). */
export const hasQueuedParadigm = (): boolean => queued !== null;
