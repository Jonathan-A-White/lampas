// tests/support/finger-down.ts — a finger kept on a word past LONG_PRESS_MS (src/ui/longPress.ts) without a real sleep (mw-fnvjof.17.266).
// The hold is a timer the app sets for LONG_PRESS_MS: while the finger goes down, that one timer is held back here and then run, as the
// clock would run it half a second on. Every other timer is the real one, so a loaded host cannot make the press shorter or longer than
// the app's own number. Not a second clock for the app: only the press's timer, only for the length of the press.
import { act } from '@testing-library/react';
import { LONG_PRESS_MS } from '../../src/ui/longPress';

/**
 * Runs `down` (the pointer going down on the target), then lets the finger's LONG_PRESS_MS pass: the long press fires inside act.
 * The caller lifts the finger afterwards (`user.pointer({ keys: '[/MouseLeft]', target })`).
 */
export async function stayDownPastLongPress(down: () => Promise<unknown>): Promise<void> {
  const realSet = globalThis.setTimeout; // clock: the press's timer is the only one held back; every other delay is the real timer
  const realClear = globalThis.clearTimeout;
  const held = new Map<number, () => void>();
  let id = 0;
  globalThis.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => { // clock: the press's step: a timer set for LONG_PRESS_MS is held back, run below
    if (ms !== LONG_PRESS_MS || typeof fn !== 'function') return realSet(fn, ms, ...args);
    id -= 1;
    held.set(id, () => fn(...args));
    return id as unknown as ReturnType<typeof setTimeout>; // clock: the held timer's handle (a negative number no real timer has)
  }) as unknown as typeof setTimeout; // clock: the type of the press's setTimeout
  globalThis.clearTimeout = ((handle?: unknown) => {
    if (typeof handle === 'number' && held.delete(handle)) return;
    realClear(handle as Parameters<typeof clearTimeout>[0]);
  }) as typeof clearTimeout;
  try {
    await down();
    await act(async () => {
      for (const [key, run] of [...held]) {
        held.delete(key);
        run();
      }
    });
  } finally {
    globalThis.setTimeout = realSet; // clock: the press is over, the real timer is back
    globalThis.clearTimeout = realClear;
  }
}
