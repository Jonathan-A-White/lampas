// tests/unit/e2e-gestures.test.ts — an e2e spec swipes and double taps on the page's clock, never on the host's (mw-5r3p30.612).
// The app times a swipe (SWIPE_MAX_MS) and the gap between two taps (the settle moment) by the page's clock. A spec that sends a drag one awaited
// event at a time, or waits with page.waitForTimeout between two taps, leaves that length to the host: a loaded one stretches it, and the swipe is
// not a swipe or the double tap is two taps. tests/support/gesture.ts (swipe, tapTwice) pauses the page clock around the gesture; this test keeps
// every spec on it. (A press that is held is tests/unit/e2e-holds.test.ts and tests/support/hold.ts.)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const E2E = 'tests/e2e';
/** A real sleep inside a gesture is allowed only on a line that says why with this mark (the browser's own fling timing, tests/support/gesture.ts). */
const REAL_TIME_MARK = '// a real-time hold:';

const files = () =>
  readdirSync(E2E)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({ name, text: readFileSync(join(E2E, name), 'utf8') }));

const lineOf = (text: string, at: number) => text.slice(0, at).split('\n').length;

describe('a swipe or a double tap in an e2e spec', () => {
  it('never sleeps in real time between a touchStart and its touchEnd', () => {
    const offences: string[] = [];
    for (const { name, text } of files()) {
      for (const start of text.matchAll(/'touchStart'/g)) {
        const from = start.index ?? 0;
        const end = text.indexOf("'touchEnd'", from);
        const held = text.slice(from, end < 0 ? undefined : end);
        for (const sleep of held.matchAll(/waitForTimeout\([^\n]*/g)) {
          if (sleep[0].includes(REAL_TIME_MARK)) continue;
          offences.push(`${E2E}/${name}:${lineOf(text, from + (sleep.index ?? 0))} sleeps while the finger is down`);
        }
      }
    }
    expect(offences).toEqual([]);
  });

  it('never sleeps in real time between two taps', () => {
    const offences: string[] = [];
    const tap = /(?:touchscreen\.tap|mouse\.click)\(/g;
    for (const { name, text } of files()) {
      for (const first of text.matchAll(tap)) {
        const from = first.index ?? 0;
        const next = text.slice(from + 1).search(tap);
        if (next < 0) continue;
        if (next > 400) continue;
        const between = text.slice(from, from + 1 + next);
        const sleep = between.match(/waitForTimeout\([^\n]*/);
        if (sleep && !sleep[0].includes(REAL_TIME_MARK)) offences.push(`${E2E}/${name}:${lineOf(text, from + (sleep.index ?? 0))} sleeps between two taps`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('has no swipe or double tap of its own, and installs the page clock the shared ones drive', () => {
    const offences: string[] = [];
    for (const { name, text } of files()) {
      for (const own of text.matchAll(/function (mouseSwipe|touchDrag|swipe|tapTwice|doubleTap|twice)\b|const (mouseSwipe|touchDrag|swipe|tapTwice|doubleTap|twice) = /g)) {
        offences.push(`${E2E}/${name}:${lineOf(text, own.index ?? 0)} has a ${own[1] ?? own[2]} of its own`);
      }
      if (/from '\.\.\/support\/gesture'/.test(text) && !text.includes('page.clock.install(')) offences.push(`${E2E}/${name} swipes or taps with tests/support/gesture but never installs the page clock`);
    }
    expect(offences).toEqual([]);
  });
});
