// src/talk/holding.ts — whether a hold-to-talk is going on anywhere in Lampas (mw-06ggew.15). Every bar tells it as its hold begins and ends (the kit's onHoldStart / onHoldEnd,
// on the Composer and on the Talk bar alike, which always pair): a tutor's answer that arrives meanwhile is not read aloud, because page audio can take the microphone from the recogniser.
// A hold also takes the microphone from Hands-free's wake listening (src/handsFree/micBusy.ts, mw-rl10piw.6): the kit calls onHoldStart before the recogniser starts.
import { takeMic } from '../handsFree/micBusy';

let count = 0;
const givesBack: (() => void)[] = [];

/** A hold has begun (the kit's onHoldStart). */
export function holdBegan(): void {
  count++;
  givesBack.push(takeMic());
}

/** A hold is over, however it ended (the kit's onHoldEnd). */
export function holdEnded(): void {
  count = Math.max(0, count - 1);
  givesBack.pop()?.();
}

/** Whether anyone is holding to talk now. */
export const isHolding = (): boolean => count > 0;
