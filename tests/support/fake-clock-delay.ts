// tests/support/fake-clock-delay.ts — a delay that only the test's FAKE clock moves (mw-fnvjof.17.272).
// A fake mill that answers late (reading-deadline, tutor-wait) is the thing the test plays, and the test moves its time on with vi.advanceTimersByTimeAsync: no real
// moment passes. Under real timers this would be a sleep, so it refuses to run there rather than become one.
import { vi } from 'vitest';

/** Settles when the test has moved the fake clock on by `ms` (vi.advanceTimersByTimeAsync); throws at once when the timers are real. */
export function onTheFakeClock(ms: number): Promise<void> {
  if (!vi.isFakeTimers()) throw new Error('onTheFakeClock needs vi.useFakeTimers(): under real timers it would be a sleep');
  let settled!: () => void;
  const done = new Promise<void>((resolve) => (settled = resolve));
  setTimeout(settled, ms); // clock: the fake clock's own step
  return done;
}
