// mw-lcv9z3g.19: a background write the app starts on its own (the start-up writes of App, a drill kept from the idea sheet or the drill plan card,
// the reviews-due count, an idea confirm) that meets a closed database (a step file's afterAll closes the db) is dropped quietly: no throw, no
// console line. Any other failure is still logged. Real Dexie on fake-indexeddb; the close is made before the write, with no timing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { isClosedDatabase, logUnlessClosed } from '../../src/data/closedDatabase';
import { announceDue } from '../../src/data/repositories/reviews';
import { startBackgroundWrites } from '../../src/data/startupWrites';
import { keepDrill } from '../../src/review/keepDrill';
import { confirmAnswer } from '../../src/review/confirm';
import { clearBus } from '../../src/events/bus';
import type { DrillResult } from '../../src/data/grammar/drillIt';

let error: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  await db.open();
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(async () => {
  clearBus();
  error.mockRestore();
  warn.mockRestore();
  await db.open();
});

const RESULT: DrillResult = { ideaId: 'article', proved: false, edgeStep: 0, topStep: 3, strong: [], weak: [], answers: [], ended: 'edge' };

/** The lines the app wrote: Dexie's own console.trace of a failed read (debug mode, on localhost) is not the app's. */
const ownLines = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(([first]) => !String(first).startsWith('Trace:'));

describe('a background write against a closed database', () => {
  it('tells a closed database from any other failure', () => {
    db.close();
    return db.reviews.toArray().then(
      () => expect.unreachable(),
      (closed: unknown) => {
        expect(isClosedDatabase(closed)).toBe(true);
        expect(isClosedDatabase(new Error('disk full'))).toBe(false);
        expect(isClosedDatabase('DatabaseClosedError')).toBe(false);
      },
    );
  });

  it('logUnlessClosed logs another failure under its message and drops a closed one', () => {
    logUnlessClosed('could not do it')(new Error('disk full'));
    expect(error).toHaveBeenCalledWith('could not do it', expect.objectContaining({ message: 'disk full' }));
    error.mockClear();
    const closed = new Error('closed');
    closed.name = 'DatabaseClosedError';
    logUnlessClosed('could not do it')(closed);
    expect(error).not.toHaveBeenCalled();
  });

  it('the start-up writes of App (the Logos match, the stale Bible mark, the schedule and levels seeding) drop quietly', async () => {
    db.close();
    await expect(startBackgroundWrites()).resolves.toBeUndefined();
    expect(ownLines(error)).toEqual([]);
  });

  it('a drill kept from the idea sheet or the drill plan card drops quietly', async () => {
    db.close();
    await expect(keepDrill(RESULT, 'prove')).resolves.toBeUndefined();
    expect(ownLines(error)).toEqual([]);
  });

  it('the reviews-due count drops quietly', async () => {
    db.close();
    await expect(announceDue()).resolves.toBeUndefined();
    expect(ownLines(error)).toEqual([]);
  });

  it('an idea confirm drops quietly', async () => {
    db.close();
    await expect(confirmAnswer({ ideaId: 'article' } as never, true)).resolves.toBeUndefined();
    expect(ownLines(warn)).toEqual([]);
    expect(ownLines(error)).toEqual([]);
  });
});
