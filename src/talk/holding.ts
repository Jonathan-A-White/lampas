// src/talk/holding.ts — whether a hold-to-talk is going on anywhere in Lampas (mw-06ggew.15). Every bar tells it as its hold begins and ends (the kit's onHoldStart / onHoldEnd,
// on the Composer and on the Talk bar alike, which always pair): a tutor's answer that arrives meanwhile is not read aloud, because page audio can take the microphone from the recogniser.
let count = 0;

/** A hold has begun (the kit's onHoldStart). */
export function holdBegan(): void {
  count++;
}

/** A hold is over, however it ended (the kit's onHoldEnd). */
export function holdEnded(): void {
  count = Math.max(0, count - 1);
}

/** Whether anyone is holding to talk now. */
export const isHolding = (): boolean => count > 0;
