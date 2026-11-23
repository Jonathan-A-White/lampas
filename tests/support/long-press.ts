// tests/support/long-press.ts — a hold in a jsdom step without a real-time sleep (mw-fnvjof.17.265). The app times a hold with one
// timer for LONG_PRESS_MS set at the finger going down (src/ui/longPress.ts); the helper keeps that timer back and runs it itself, inside act,
// while the finger is down, so a step that holds a number, a heading or a word spends no half second of the host's clock and cannot be too early
// on a loaded one. A timer of any other delay is the real one.
import { act } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import { LONG_PRESS_MS } from '../../src/ui/longPress';

/** The finger goes down on `target`, the hold time passes on a clock the helper moves, and the finger lifts: the click that ends it is not a tap. */
export async function holdOn(user: UserEvent, target: HTMLElement): Promise<void> {
  const held = new Map<object, () => void>();
  const realSet = globalThis.setTimeout; // clock: only a timer set for LONG_PRESS_MS is held back, every other delay keeps the real timer
  const realClear = globalThis.clearTimeout; // clock: a cleared hold is dropped here, any other id goes to the real clearTimeout
  const set = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: TimerHandler, ms?: number, ...args: unknown[]) => { // clock: the hold clock's step
    if (ms !== LONG_PRESS_MS || typeof fn !== 'function') return realSet(fn, ms, ...args);
    const id = {};
    held.set(id, () => fn(...args));
    return id as unknown as ReturnType<typeof setTimeout>; // clock: the hold's id, kept apart from every real timer's
  }) as unknown as typeof setTimeout); // clock: the type of the hold clock's setTimeout
  const clear = vi.spyOn(globalThis, 'clearTimeout').mockImplementation(((id?: unknown) => {
    if (typeof id === 'object' && id !== null && held.delete(id)) return;
    realClear(id as Parameters<typeof clearTimeout>[0]);
  }) as typeof clearTimeout);
  try {
    await user.pointer({ keys: '[MouseLeft>]', target });
    await act(async () => {
      for (const [id, run] of [...held]) {
        held.delete(id);
        run();
      }
    });
    await user.pointer({ keys: '[/MouseLeft]', target });
  } finally {
    set.mockRestore();
    clear.mockRestore();
  }
}
