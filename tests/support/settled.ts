// tests/support/settled.ts — the one shared wait for a thing the page is still bringing (mw-fnvjof.17.236, the class of mw-fnvjof.17.113's expectInWindow).
// A spec that takes one look at a thing the moment a nearby element shows (the Study this row once Next is there, the lit verse once its mark is on, scrolled to the box's top) reads it
// on its way: on a calm host the page has finished by then, and on a host at two to five times its cores it has not, and the spec fails whole runs while passing alone. This waits on the
// thing itself: it looks again, with expect.poll (so the host's load only lengthens it, and a fixed sleep never decides), until the look shows nothing wrong, and gives that look back.
import { expect } from '@playwright/test';

/** How long a thing may take to settle: the test's own timeout still ends a wait that is longer. */
export const SETTLE_MS = 30_000;

/**
 * Looks (`look`: one read of the page, as plain data) again and again until `problem` finds nothing wrong with it (null), and returns that look. `problem` says in a sentence what is
 * wrong, so a thing that never comes is named by what was wrong at the last look. Put the whole condition in `problem`: a wait on one side followed by a one-shot look at the other fails
 * while the page is still on its way.
 */
export async function untilSettled<T>(look: () => Promise<T>, problem: (seen: T) => string | null, options: { message?: string; timeout?: number } = {}): Promise<T> {
  let last: T | undefined;
  await expect
    .poll(
      async () => {
        last = await look();
        return problem(last) ?? 'settled';
      },
      { message: options.message ?? 'the thing settles', timeout: options.timeout ?? SETTLE_MS },
    )
    .toBe('settled');
  return last as T;
}
