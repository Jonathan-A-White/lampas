// tests/unit/wait-progress.test.ts — waitWhileChanging waits while what is drawn is still changing (mw-qtu3zvz.186).
// Choosing "Greek and Hebrew" again moves two dials one after the other, each move a run of writes that every drawn Settings row re-reads over fake-indexeddb: the first took 3-4 s
// at load 16, so at load 30 the two moves outran the one ASYNC_WAIT_MS a plain waitFor gives to the whole choice. The wait runs on as long as each wait ends on a new state.
import { describe, expect, it } from 'vitest';
import { waitWhileChanging } from '../support/wait-progress';

const BUDGET_MS = 300;

/** A state that moves on every `every` ms through `states`, the way two dials move one after the other. */
function moving(states: string[], every: number): { now: () => string; stop: () => void } {
  let at = 0;
  const timer = setInterval(() => {
    if (at < states.length - 1) at += 1;
  }, every);
  return { now: () => states[at], stop: () => clearInterval(timer) };
}

describe('waitWhileChanging', () => {
  it('waits past its budget while each wait ends on a new state, as two dials moving one after the other do', async () => {
    const dials = moving(['English only', 'Hebrew', 'Greek and Hebrew'], 200);
    try {
      const started = performance.now();
      await waitWhileChanging(() => expect(dials.now()).toBe('Greek and Hebrew'), dials.now, BUDGET_MS);
      expect(performance.now() - started).toBeGreaterThan(BUDGET_MS);
    } finally {
      dials.stop();
    }
  });

  it('fails when a whole wait goes by with nothing changing, naming what it was waiting for', async () => {
    const stuck = moving(['English only'], 10_000);
    try {
      await expect(waitWhileChanging(() => expect(stuck.now()).toBe('Greek and Hebrew'), stuck.now, BUDGET_MS)).rejects.toThrow(/Greek and Hebrew/);
    } finally {
      stuck.stop();
    }
  });

  // mw-fnvjof.17.177: after "Greek and Hebrew" again the screen stood at English only for a whole wait on a loaded host: the writes were going on in the store, the redraw had not come.
  it('goes on while what it also watches in the store moves, though the screen stands where it was', async () => {
    const screen = 'English only';
    const stored = moving(['0/0', '1/0', '1/1'], 250);
    const drawn = moving(['English only', 'English only', 'Greek and Hebrew'], 300);
    try {
      const started = performance.now();
      await waitWhileChanging(
        () => expect(drawn.now()).toBe('Greek and Hebrew'),
        async () => `${screen}|${stored.now()}`,
        BUDGET_MS,
      );
      expect(performance.now() - started).toBeGreaterThan(BUDGET_MS);
    } finally {
      stored.stop();
      drawn.stop();
    }
  });

  it('fails when neither the screen nor the store moved in a whole wait, with a progress read that is asked of the store', async () => {
    const stuck = moving(['0/0'], 10_000);
    try {
      await expect(waitWhileChanging(() => expect(stuck.now()).toBe('1/1'), async () => stuck.now(), BUDGET_MS)).rejects.toThrow(/1\/1/);
    } finally {
      stuck.stop();
    }
  }, 3000);
});
