// src/handsFree/micBusy.ts — whether another feature of Lampas has the microphone now (mw-rl10piw.6, the epic's risk 5): every hold-to-talk (src/talk/holding.ts, which
// each bar tells as its hold begins and ends: the bars of src/talk/Bars.tsx and the Composers) and every recording (src/audio/recorder.ts ReadingRecorder: the reading
// check's Read, the Try it step, Memorize's Weave recall). While one is going on the Hands-free session (src/handsFree/session.ts) stops listening for the wake word and
// closes its microphone, so a hold with Hands-free On hears what it hears with it Off; when the last one ends the wake listens again.
let users = 0;
const listeners = new Set<() => void>();

const tell = (): void => listeners.forEach((listener) => listener());

/** Another feature takes the microphone (call it before it opens one). The function returned gives it back; a second call does nothing. */
export function takeMic(): () => void {
  users++;
  if (users === 1) tell();
  let given = false;
  return () => {
    if (given) return;
    given = true;
    users = Math.max(0, users - 1);
    if (users === 0) tell();
  };
}

/** Whether another feature has the microphone now. */
export const isMicBusy = (): boolean => users > 0;

/** Calls `listener` when the microphone becomes busy or free; returns how to stop. */
export function onMicBusy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
