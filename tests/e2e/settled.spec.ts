// The shared settle wait (tests/support/settled.ts, mw-fnvjof.17.236): a spec that reads a thing the page is still bringing (the Study this row under a wrong answer, the verse a
// Listen has lit scrolled into its box) looks again until nothing is wrong with it, instead of taking one look, and a thing that never comes is named by what was wrong at the last look.
import { expect, test } from '@playwright/test';
import { untilSettled } from '../support/settled';

/** A look that gives each value of `seen` in turn, the last one for ever, and counts its looks. */
function looks<T>(seen: T[]): { look: () => Promise<T>; count: () => number } {
  let n = 0;
  return { look: async () => seen[Math.min(n++, seen.length - 1)], count: () => n };
}

test('a thing that is still on its way is looked at again until it is as it must be, and the last look is given back', async () => {
  const row = looks([{ shown: false }, { shown: false }, { shown: true }]);
  const seen = await untilSettled(row.look, (r) => (r.shown ? null : 'the row is not drawn yet'));
  expect(seen).toEqual({ shown: true });
  expect(row.count()).toBe(3);
});

test('a thing that is right at the first look is looked at once', async () => {
  const row = looks([{ shown: true }]);
  await untilSettled(row.look, (r) => (r.shown ? null : 'the row is not drawn yet'));
  expect(row.count()).toBe(1);
});

test('a thing that never comes fails, naming what was wrong at the last look', async () => {
  const row = looks([{ y: -2 }]);
  await expect(untilSettled(row.look, (r) => (r.y >= 85 ? null : `y is ${r.y}, not 85 or more`), { timeout: 600 })).rejects.toThrow('y is -2, not 85 or more'); // short on purpose: this look never comes, and the spec waits only to see the failure named
});
