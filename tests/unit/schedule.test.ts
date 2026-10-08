import { describe, expect, it } from 'vitest';
import { DAY, FLASHCARD_STEP, RARE_CHECK_DAYS, STEP_DAYS, isDue, modeFor, nextReview, type Review } from '../../src/data/schedule';

const NOW = Date.UTC(2026, 9, 8, 9, 0, 0);
const at = (days: number) => NOW + days * DAY;

function review(step: number, over: Partial<Review> = {}): Review {
  return { kind: 'word', id: 'λέγω', step, due: NOW, lastWhen: NOW - DAY, lapses: 0, rights: 0, ...over };
}

describe('the spaced schedule', () => {
  it('has the steps 1, 3, 7, 14, 30, 60 days and a rare check every 90', () => {
    expect(STEP_DAYS).toEqual([1, 3, 7, 14, 30, 60]);
    expect(RARE_CHECK_DAYS).toBe(90);
  });

  it('keeps a new item that is answered right once at step 0, due tomorrow', () => {
    const r = nextReview(undefined, true, NOW);
    expect(r).toEqual({ step: 0, due: at(1), lastWhen: NOW, lapses: 0, rights: 1 });
  });

  it('moves an item to step 1 (3 days) when it is right twice in a row', () => {
    const first = nextReview(undefined, true, NOW);
    const second = nextReview(first, true, at(1));
    expect(second.step).toBe(1);
    expect(second.due).toBe(at(1) + 3 * DAY);
    expect(second.rights).toBe(0);
  });

  it('does not count a right across a wrong', () => {
    const a = nextReview(review(2, { rights: 1 }), false, NOW);
    const b = nextReview(a, true, NOW);
    expect(b.step).toBe(0);
    expect(b.rights).toBe(1);
  });

  it('drops a wrong at step 3 (14 days) to step 1, due tomorrow, with a lapse', () => {
    const r = nextReview(review(3, { lapses: 1 }), false, NOW);
    expect(r.step).toBe(1);
    expect(r.due).toBe(at(1));
    expect(r.lapses).toBe(2);
    expect(r.rights).toBe(0);
  });

  it('never drops below step 0', () => {
    expect(nextReview(review(1), false, NOW).step).toBe(0);
    expect(nextReview(review(0), false, NOW).step).toBe(0);
  });

  it('puts the item due again in 90 days past the last step', () => {
    const r = nextReview(review(5, { rights: 1 }), true, NOW);
    expect(r.step).toBe(6);
    expect(r.due).toBe(at(90));
    const again = nextReview(r, true, at(90));
    expect(again.step).toBe(6);
    expect(again.due).toBe(at(90) + 90 * DAY);
    const third = nextReview(again, true, at(180));
    expect(third.step).toBe(6);
  });

  it('drops a wrong in the rare check back two steps', () => {
    expect(nextReview(review(6), false, NOW).step).toBe(4);
  });

  it('is due at the moment it falls due and after, not before', () => {
    const r = review(0, { due: at(1) });
    expect(isDue(r, at(1) - 1)).toBe(false);
    expect(isDue(r, at(1))).toBe(true);
    expect(isDue(r, at(2))).toBe(true);
  });
});

describe('the question mode follows the step', () => {
  it('turns to a flashcard at step 3 (the 14-day gap), which is the one named constant', () => {
    expect(FLASHCARD_STEP).toBe(3);
    expect(STEP_DAYS[FLASHCARD_STEP]).toBe(14);
  });

  it('is multiple choice below that step and a flashcard at and above it, the rare check included', () => {
    for (let step = 0; step < FLASHCARD_STEP; step += 1) expect(modeFor(step)).toBe('choice');
    for (let step = FLASHCARD_STEP; step <= STEP_DAYS.length; step += 1) expect(modeFor(step)).toBe('flashcard');
  });

  it('puts a word that lapses below the step back to multiple choice', () => {
    const strong = review(FLASHCARD_STEP);
    expect(modeFor(strong.step)).toBe('flashcard');
    expect(modeFor(nextReview(strong, false, NOW).step)).toBe('choice');
    // from further up one lapse drops two steps; step 5 lands on the threshold and stays a flashcard
    expect(modeFor(nextReview(review(FLASHCARD_STEP + 1), false, NOW).step)).toBe('choice');
    expect(modeFor(nextReview(review(FLASHCARD_STEP + 2), false, NOW).step)).toBe('flashcard');
  });
});
