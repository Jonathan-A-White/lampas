// tests/unit/one-tap.test.ts — a control that flips a state takes one tap per settle moment (src/ui/settle.ts oneTap, mw-svw421.41): the second tap of a
// double tap does nothing, a tap on another control is his next, and a tap after the moment has passed is a new one.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oneTap, settle, SETTLE_MS } from '../../src/ui/settle';

let now = 0;
beforeEach(() => {
  now += 10_000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  settle.ms = SETTLE_MS;
});
afterEach(() => {
  settle.ms = 0;
  vi.restoreAllMocks();
});

describe('oneTap', () => {
  it('drops the second tap of a double tap on the same control', () => {
    const act = vi.fn();
    oneTap('a', act);
    now += 120;
    oneTap('a', act);
    expect(act).toHaveBeenCalledTimes(1);
  });

  it('lets a tap on another control through, and a tap on the same one after the moment', () => {
    const act = vi.fn();
    oneTap('a', act);
    now += 80;
    oneTap('b', act);
    expect(act).toHaveBeenCalledTimes(2);
    now += SETTLE_MS;
    oneTap('b', act);
    expect(act).toHaveBeenCalledTimes(3);
  });

  it('takes every tap when the moment is off', () => {
    settle.ms = 0;
    const act = vi.fn();
    oneTap('a', act);
    oneTap('a', act);
    expect(act).toHaveBeenCalledTimes(2);
  });
});
