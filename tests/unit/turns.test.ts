import { describe, expect, it } from 'vitest';
import { afterTurns, oneTurn, untilTurns } from '../support/turns';

// A chain of `links` reads, each one a turn of the task queue after the one before (a screen that reads, then reads again with what it found).
function chain(links: number): { finished: () => boolean; start: () => Promise<void> } {
  let done = false;
  return {
    finished: () => done,
    start: async () => {
      for (let i = 0; i < links; i++) await oneTurn();
      done = true;
    },
  };
}

describe('afterTurns is a count of turns, not a wait for the work', () => {
  it('does not see a chain of 40 turns to its end in the default 30', async () => {
    const c = chain(40);
    void c.start();
    await afterTurns(30);
    expect(c.finished()).toBe(false); // the documented limit: a longer chain outruns the count
    await afterTurns(30);
    expect(c.finished()).toBe(true);
  });

  it('untilTurns waits for the work itself, however many turns it takes', async () => {
    const c = chain(40);
    void c.start();
    await untilTurns(c.finished);
    expect(c.finished()).toBe(true);
  });

  it('untilTurns says so when the work is not done by its limit, rather than going on', async () => {
    const c = chain(40);
    void c.start();
    await expect(untilTurns(c.finished, 10)).rejects.toThrow(/not done after 10 turns/);
    await untilTurns(c.finished); // let the chain end before the test does
  });
});
