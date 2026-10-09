// The pace dial (src/data/pace.ts, mw-bsf54t.7): his setting, turned by the words due, the last round and a clean week.
import { describe, expect, it } from 'vitest';
import { DAY } from '../../src/data/schedule';
import { afterRound, cleanDaysOf, normaliseNewWordsADay, paceFor, paceNote } from '../../src/data/pace';

describe('paceFor', () => {
  it('is none when New words a day is Off, whatever the reviews say', () => {
    expect(paceFor(0, 0, 1, 30)).toEqual({ count: 0, reason: 'normal' });
    expect(paceFor(0, 99, 0.1, 0)).toEqual({ count: 0, reason: 'normal' });
  });

  it('is his setting when the reviews are in hand', () => {
    expect(paceFor(3, 0, null, 0)).toEqual({ count: 3, reason: 'normal' });
    expect(paceFor(5, 20, 0.6, 6)).toEqual({ count: 5, reason: 'normal' });
  });

  it('is dialled back to none with more than 20 words due', () => {
    expect(paceFor(3, 21, 1, 0)).toEqual({ count: 0, reason: 'back' });
    expect(paceFor(10, 25, null, 30)).toEqual({ count: 0, reason: 'back' });
  });

  it('is dialled back to none when the last round scored under 60 percent', () => {
    expect(paceFor(5, 0, 0.59, 0)).toEqual({ count: 0, reason: 'back' });
    expect(paceFor(5, 0, 0, 30)).toEqual({ count: 0, reason: 'back' });
  });

  it('goes one notch up after a clean week', () => {
    expect(paceFor(3, 4, 0.9, 7)).toEqual({ count: 5, reason: 'up' });
    expect(paceFor(5, 4, 0.9, 12)).toEqual({ count: 10, reason: 'up' });
  });

  it('never goes above 10', () => {
    expect(paceFor(10, 0, 1, 90)).toEqual({ count: 10, reason: 'normal' });
  });
});

describe('the words around it', () => {
  it('names the reason only when the pace is not normal', () => {
    expect(paceNote('back')).toBe('Dialled back: clear your reviews first');
    expect(paceNote('up')).toBe('Dialled up: a clean week');
    expect(paceNote('normal')).toBeNull();
  });

  it('reads a saved setting as one of 0, 3, 5, 10, else 3', () => {
    expect(normaliseNewWordsADay('0')).toBe(0);
    expect(normaliseNewWordsADay('10')).toBe(10);
    expect(normaliseNewWordsADay(5)).toBe(5);
    expect(normaliseNewWordsADay('7')).toBe(3);
    expect(normaliseNewWordsADay(undefined)).toBe(3);
  });
});

describe('clean days', () => {
  const t0 = 1_000 * DAY;
  it('start at the first round and grow while the rounds go well', () => {
    const first = afterRound(null, 0.9, t0);
    expect(cleanDaysOf(first, t0)).toBe(0);
    const later = afterRound(first, 0.8, t0 + 6 * DAY);
    expect(cleanDaysOf(later, t0 + 6 * DAY)).toBe(6);
    expect(cleanDaysOf(afterRound(later, 1, t0 + 7 * DAY), t0 + 7 * DAY)).toBe(7);
  });

  it('start again after a round under 60 percent', () => {
    const first = afterRound(null, 0.9, t0);
    const poor = afterRound(first, 0.5, t0 + 5 * DAY);
    expect(cleanDaysOf(poor, t0 + 5 * DAY)).toBe(0);
    expect(cleanDaysOf(afterRound(poor, 0.9, t0 + 9 * DAY), t0 + 9 * DAY)).toBe(4);
  });

  it('are none after a week with no round', () => {
    const first = afterRound(null, 0.9, t0);
    const second = afterRound(first, 0.9, t0 + 7 * DAY);
    expect(cleanDaysOf(second, t0 + 15 * DAY)).toBe(0);
    expect(cleanDaysOf(null, t0)).toBe(0);
  });

  it('restart when two rounds are over a week apart', () => {
    const first = afterRound(null, 0.9, t0);
    expect(cleanDaysOf(afterRound(first, 0.9, t0 + 20 * DAY), t0 + 20 * DAY)).toBe(0);
  });
});
