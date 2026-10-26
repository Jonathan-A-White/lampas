// src/maps/period.ts: how a map's dates read on its card (negative years are BC).
import { describe, expect, it } from 'vitest';
import { period } from '../../src/maps/period';

describe('period', () => {
  it('says c. and the year for one date in BC', () => {
    expect(period(-2070, -2070)).toBe('c. 2070 BC');
  });
  it('says both ends for a span in BC, with BC once at the end', () => {
    expect(period(-1010, -970)).toBe('1010 to 970 BC');
  });
  it('says AD and the year for one date in AD', () => {
    expect(period(30, 30)).toBe('AD 30');
  });
  it('says both eras when the span crosses from BC to AD', () => {
    expect(period(-5, 30)).toBe('5 BC to AD 30');
  });
  it('says AD once at the front for a span in AD', () => {
    expect(period(27, 30)).toBe('AD 27 to 30');
  });
  it('reads a map with only a start as one date', () => {
    expect(period(-1200, undefined)).toBe('c. 1200 BC');
    expect(period(30, undefined)).toBe('AD 30');
  });
  it('puts the earlier year first when the source gives them the wrong way round', () => {
    expect(period(-913, -984)).toBe('984 to 913 BC');
  });
  it('is empty for a map with no dates', () => {
    expect(period(undefined, undefined)).toBe('');
  });
});
