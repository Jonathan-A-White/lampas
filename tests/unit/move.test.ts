// moveFor (mw-hqd5bz.11): when the answers of his last 20 grammar questions say New words at should move.
import { describe, expect, it } from 'vitest';
import { MOVE_DOWN, MOVE_UP, MOVE_WINDOW, moveFor } from '../../src/data/grammar/move';

/** `rights` right answers then `wrongs` wrong ones */
const answers = (rights: number, wrongs: number): boolean[] => [...Array<boolean>(rights).fill(true), ...Array<boolean>(wrongs).fill(false)];

describe('moveFor', () => {
  it('keeps the rule as the story gives it: 20 answers, 85 percent up, 60 percent down', () => {
    expect([MOVE_WINDOW, MOVE_UP, MOVE_DOWN]).toEqual([20, 0.85, 0.6]);
  });

  it('moves up from solid when 85 percent or more of the last 20 are right (17 of 20)', () => {
    expect(moveFor('solid', answers(17, 3))).toBe('up');
    expect(moveFor('solid', answers(20, 0))).toBe('up');
    expect(moveFor('solid', answers(16, 4))).toBe('none');
  });

  it('moves down from frontier when under 60 percent of the last 20 are right (11 of 20)', () => {
    expect(moveFor('frontier', answers(11, 9))).toBe('down');
    expect(moveFor('frontier', answers(0, 20))).toBe('down');
    expect(moveFor('frontier', answers(12, 8))).toBe('none');
  });

  it('does not move up from frontier or down from solid, however the answers go', () => {
    expect(moveFor('frontier', answers(20, 0))).toBe('none');
    expect(moveFor('solid', answers(0, 20))).toBe('none');
  });

  it('is none with fewer than 20 answers, even all right or all wrong', () => {
    expect(moveFor('solid', answers(19, 0))).toBe('none');
    expect(moveFor('frontier', answers(0, 19))).toBe('none');
    expect(moveFor('solid', [])).toBe('none');
  });

  it('looks only at the last 20 of a longer list', () => {
    // the first ten wrong answers are older than the window
    expect(moveFor('solid', [...answers(0, 10), ...answers(20, 0)])).toBe('up');
    expect(moveFor('frontier', [...answers(10, 0), ...answers(0, 20)])).toBe('down');
  });
});
