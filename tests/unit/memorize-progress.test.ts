// tests/unit/memorize-progress.test.ts — where a memorized verse is, in words (mw-fu7dqf.11): progressOf from the schedule row and the last recall, and the line the mark shows.
import { describe, expect, it } from 'vitest';
import { DAY, RARE_STEP } from '../../src/data/schedule';
import { dueDay, lastOf, progressLine, progressOf, STEPS } from '../../src/memorize/progress';

// a Wednesday, noon, in local time
const NOW = new Date(2026, 9, 21, 12, 0, 0).getTime();
const LAST = { score: 0.9, when: NOW - DAY, right: 9, of: 10 };

describe('progressOf', () => {
  it('step 0 due tomorrow is step 1 of 7 with no last recall', () => {
    const p = progressOf({ step: 0, due: NOW + DAY }, null, NOW);
    expect(p).toEqual({ step: 1, of: 7, due: 'tomorrow', last: null });
    expect(progressLine(p)).toBe('Step 1 of 7 · due tomorrow');
  });

  it('step 2 due in 6 days is a weekday', () => {
    const p = progressOf({ step: 2, due: NOW + 6 * DAY }, LAST, NOW);
    expect(p.due).toBe('Tue');
    expect(progressLine(p)).toBe('Step 3 of 7 · last 9 of 10 · due Tue');
  });

  it('step 3 due in 14 days is a date', () => {
    const p = progressOf({ step: 3, due: NOW + 14 * DAY }, LAST, NOW);
    expect(p.due).toBe('Nov 4');
    expect(progressLine(p)).toBe('Step 4 of 7 · last 9 of 10 · due Nov 4');
  });

  it('the rare step is step 7 of 7', () => {
    expect(STEPS).toBe(7);
    const p = progressOf({ step: RARE_STEP, due: NOW + 90 * DAY }, LAST, NOW);
    expect(p.step).toBe(7);
    expect(progressLine(p)).toMatch(/^Step 7 of 7 · last 9 of 10 · due /);
  });

  it('a verse that is due now, or was due, says today', () => {
    expect(dueDay(NOW - 3 * DAY, NOW)).toBe('today');
    expect(dueDay(NOW + 1000, NOW)).toBe('today');
  });

  it('a date in another year carries the year', () => {
    expect(dueDay(new Date(2027, 0, 5).getTime(), NOW)).toBe('Jan 5, 2027');
  });
});

describe('lastOf', () => {
  it('counts the words asked less the words missed', () => {
    const asked = Array.from({ length: 10 }, (_, i) => ({ token: `w${i}`, lang: 'en' }));
    expect(lastOf({ score: 0.9, when: 5, missed: ['w3'], asked })).toEqual({ score: 0.9, when: 5, right: 9, of: 10 });
  });

  it('is null before the first recall', () => {
    expect(lastOf(undefined)).toBeNull();
  });

  it('a recall that asked for no words shows its score as a percent', () => {
    const last = lastOf({ score: 1, when: 5, missed: [], asked: [] });
    expect(progressLine(progressOf({ step: 1, due: NOW + DAY }, last, NOW))).toBe('Step 2 of 7 · last 100% · due tomorrow');
  });
});
