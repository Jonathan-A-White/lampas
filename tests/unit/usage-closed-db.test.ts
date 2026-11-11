// mw-lcv9z3g.15: a usage count whose write meets a closed database (a step file's afterAll closes the db right after cleanup(), with the
// write of the last tap still queued) is not a failure worth a console line: the count is dropped quietly. Any other failure is still logged.
// Real Dexie on fake-indexeddb; the close is made between the event and the write, with no timing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus, publish } from '../../src/events/bus';
import { startUsageLog } from '../../src/tips/usageLog';

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  await db.open();
  await db.usage.clear();
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
  clearBus();
  logged.mockRestore();
  await db.open();
  await db.usage.clear();
});

describe('the usage log against a closed database', () => {
  it('drops the count of a write that meets a closed database, without a throw or a log line', async () => {
    const stop = startUsageLog();
    publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
    db.close(); // what a step file's afterAll does, with that write still queued
    await expect(stop()).resolves.toBeUndefined();
    expect(logged).not.toHaveBeenCalled();
  });

  it('still logs a write that fails for any other reason', async () => {
    const stop = startUsageLog();
    const failing = vi.spyOn(db.usage, 'get').mockRejectedValue(new Error('disk full'));
    publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
    await stop();
    failing.mockRestore();
    expect(logged).toHaveBeenCalledWith('could not keep the usage count', expect.objectContaining({ message: 'disk full' }));
  });
});
