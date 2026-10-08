// A pinned bottom bar clears a three-button navigation bar (48 px) even when the phone reports no inset (mw-5r3p30.42).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');

/** The floor in px of `--name: max(env(safe-area-inset-bottom), Npx)`. */
function floorOf(name: string): number {
  const m = css.match(new RegExp(`--${name}:\\s*max\\(env\\(safe-area-inset-bottom\\),\\s*(\\d+)px\\)`));
  expect(m, name).not.toBeNull();
  return Number(m![1]);
}

describe('the bottom insets', () => {
  it('clear 48 px under a pinned bar when env(safe-area-inset-bottom) is 0', () => {
    expect(floorOf('lp-bar-inset')).toBeGreaterThanOrEqual(48);
  });

  it('clear 48 px under the last row of a scroll box when env(safe-area-inset-bottom) is 0', () => {
    expect(floorOf('lp-end-inset')).toBeGreaterThanOrEqual(48);
  });
});
