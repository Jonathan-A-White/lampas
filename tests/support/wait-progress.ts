// tests/support/wait-progress.ts — a wait for a result reached in more than one move (mw-qtu3zvz.186).
// A tap that moves two dials writes them one after the other, and every write is re-read by each Settings row drawn, over fake-indexeddb: a loaded host takes the one wait
// (ASYNC_WAIT_MS) for the first move alone. A plain waitFor gives the whole choice that one wait; this gives each state it passes through its own, and fails only when a whole wait
// goes by with nothing where it was, so a drawing that has stopped still fails after one wait. What is watched may be more than the screen (mw-fnvjof.17.177): a loaded host drew the old
// state for a whole wait while the writes behind it went on in the store, so a step that moves a setting also gives what the store holds of it, and a wait in which only the store moved goes on.
import { waitFor } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Wait until `check` passes, as often as it takes while `seen` (what the screen draws, and what the store holds that it draws from, as text, from a read that may be asked) is a new value at the end
 * of each wait; the last wait's failure when it is not.
 * `timeout` is for the test of this helper only; a step passes none, and the wait is the shared ASYNC_WAIT_MS.
 */
export async function waitWhileChanging(check: () => void, seen: () => string | Promise<string>, timeout?: number): Promise<void> {
  const options = timeout === undefined ? undefined : { timeout };
  for (;;) {
    const before = await seen();
    try {
      await waitFor(check, options);
      return;
    } catch (failure) {
      if ((await seen()) === before) throw failure;
    }
  }
}

/** What the fake Postern shows of the phone's calls: the part of it `waitForGrists` reads. */
interface GristSource {
  calls: string[];
  received: { grist: { kind: string } }[];
}

/**
 * Wait until the fake Postern has taken in `count` grists of `kind`, for as long as the phone is getting on with sending: between a tap on Send and the grist the app writes the talk, signs and
 * makes its calls (challenge, me, messages) one after the other, each slow on a loaded host, and the one ASYNC_WAIT_MS outran them at load 31.7 of 20 cores (mw-u2w5klk.349.151). Each wait
 * that ends with a new call made, a new grist in, or `also` (what the store holds of the talk, as text) changed goes on; one that ends with none fails, saying what it saw.
 * `timeout` is for the test of this helper only.
 */
export async function waitForGrists(fake: GristSource, kind: string, count: number, options: { timeout?: number; also?: () => string | Promise<string> } = {}): Promise<void> {
  const of = () => fake.received.filter((g) => g.grist.kind === kind).length;
  try {
    await waitWhileChanging(
      () => expect(of(), `grists of ${kind} taken in by the fake Postern; calls so far: ${fake.calls.join(', ') || 'none'}`).toBe(count),
      async () => `${fake.calls.length}|${fake.received.length}|${(await options.also?.()) ?? ''}`,
      options.timeout,
    );
  } catch (failure) {
    throw new Error(`${failure instanceof Error ? failure.message.split('\n')[0] : String(failure)}; no ${kind} request seen and the phone made no further call in a whole wait`);
  }
}
