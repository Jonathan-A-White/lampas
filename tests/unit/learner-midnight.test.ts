// A word he "added today" must still be "new today" when the tutor's request is sent, however close to midnight the test runs
// (mw-5r3p30.180: the gate ran 23:58 to 00:05 and learnWordToday's Date.now() stamp fell on the day before the send).
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { learnerSummary } from '../../src/data/learnerSummary';
import { learnWordToday } from '../support/learner';

const lastSecondOfDay = (): number => {
  const day = new Date();
  day.setHours(23, 59, 59, 500);
  return day.getTime();
};

beforeEach(async () => {
  await db.open();
  await db.words.clear();
  // Only Date is faked, so Dexie and the timers still run. The clock starts half a second before midnight, as the gate's did.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(lastSecondOfDay());
});
afterEach(() => vi.useRealTimers());
afterAll(() => db.close());

describe('a word added today, with the clock at 23:59:59.5', () => {
  it('is still new today when the send comes after midnight', async () => {
    await learnWordToday('σάρξ');
    vi.advanceTimersByTime(2_000); // the test took its time: it is now past midnight
    expect(await learnerSummary()).toContain('new today: σάρξ');
  });
});
