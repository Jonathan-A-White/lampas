// mw-5r3p30.86: App's cleanup drops the stop() promise of the usage log ('void stop()'), so a scenario's writes can still be
// running when the next one clears the tables or the file closes the db (the 'could not keep the usage count ... database
// has been closed' lines after a step file). usageWritesSettled() waits for every log's pending writes, stopped or not.
// The write is held pending here with a deferred promise: no load, no timing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publish, clearBus } from '../../src/events/bus';

const held: Array<() => void> = [];
vi.mock('../../src/data/repositories', async (original) => ({
  ...(await original<typeof import('../../src/data/repositories')>()),
  recordUsage: vi.fn(() => new Promise<void>((resolve) => held.push(resolve))),
}));

import { startUsageLog, usageWritesSettled } from '../../src/tips/usageLog';

afterEach(() => {
  clearBus();
  held.length = 0;
});

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('the usage log settles', () => {
  it('waits for a write still pending after its stop() was dropped', async () => {
    const stop = startUsageLog();
    publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
    void stop(); // what App's cleanup does with it
    await flush();
    expect(held.length).toBeGreaterThan(0);

    let settled = false;
    const settling = usageWritesSettled().then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);

    while (held.length > 0) {
      held.shift()?.();
      await flush();
    }
    await settling;
    expect(settled).toBe(true);
  });

  it('resolves at once when nothing is pending', async () => {
    await expect(usageWritesSettled()).resolves.toBeUndefined();
  });
});
