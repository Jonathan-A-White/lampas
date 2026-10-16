// tests/unit/e2e-holds.test.ts — an e2e spec holds a press on the page's clock, never on a real sleep (mw-5r3p30.388).
// The app times a hold by the page's clock (Date.now, setTimeout); a spec that sleeps with page.waitForTimeout(ms) between mouse.down and
// mouse.up leaves the length the page sees to the host: a loaded one delivers the press late or the release late, and a tap becomes a hold
// or a hold too short. tests/support/hold.ts holdFor pauses the page clock and runs it for exactly `ms`; this test keeps every spec on it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const E2E = 'tests/e2e';
/** A real sleep inside a hold is allowed only on a line that says why with this mark (a live recording, which plays in real time). */
const REAL_TIME_MARK = '// a real-time hold:';

const files = () =>
  readdirSync(E2E)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({ name, text: readFileSync(join(E2E, name), 'utf8') }));

const lineOf = (text: string, at: number) => text.slice(0, at).split('\n').length;

describe('a press held in an e2e spec', () => {
  it('never sleeps in real time between mouse.down and mouse.up', () => {
    const offences: string[] = [];
    for (const { name, text } of files()) {
      for (const down of text.matchAll(/mouse\.down\(/g)) {
        const from = down.index ?? 0;
        const up = text.indexOf('mouse.up(', from);
        const held = text.slice(from, up < 0 ? undefined : up);
        for (const sleep of held.matchAll(/waitForTimeout\([^\n]*/g)) {
          if (sleep[0].includes(REAL_TIME_MARK)) continue;
          offences.push(`${E2E}/${name}:${lineOf(text, from + (sleep.index ?? 0))} sleeps while the press is held`);
        }
      }
    }
    expect(offences).toEqual([]);
  });

  it('uses the shared holdFor, and installs the page clock it drives', () => {
    const offences: string[] = [];
    for (const { name, text } of files()) {
      if (/function holdFor\b/.test(text)) offences.push(`${E2E}/${name} has a holdFor of its own`);
      if (/from '\.\.\/support\/hold'/.test(text) && !text.includes('page.clock.install(')) offences.push(`${E2E}/${name} holds with holdFor but never installs the page clock`);
    }
    expect(offences).toEqual([]);
  });
});
