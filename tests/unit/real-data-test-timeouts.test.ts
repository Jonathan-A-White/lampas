// tests/unit/real-data-test-timeouts.test.ts — an it() that runs the ship or the align-choose listing over the real Septuagint data names its own timeout (mw-u2w5klk.349.68).
// Those runs take a minute on a loaded host (load 21 to 33 on 20 cores); vitest's 40 s testTimeout failed batch 598 and two stories on
// 'lists Genesis 27 with Peradventure on μή ποτε' with nothing wrong in the data. The beforeAll beside it was already given 10 * HOOK_TIMEOUT_MS.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = 'tests/unit';
const OPENS_IT = /\bit(?:\.skipIf\([^)]*\))?(?:\.each\([^)]*\))?\(/g;
const RUNS = /\b(?:runShip|runAlignChoose)\(/;
// the real data is what the test calls `sources` (tests/support/lxx-real-data.ts); the other files give the runners fixtures or a mock
const REAL = /\bsources\b/;
const TIMEOUT = /,\s*10\s*\*\s*HOOK_TIMEOUT_MS\s*,?\s*\)$/;

function callAt(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '(') depth++;
    if (source[i] === ')' && --depth === 0) return source.slice(open, i + 1);
  }
  return source.slice(open);
}

/** The lines of the it() calls of one source that run the ship or the listing over the real data and end with no 10 * HOOK_TIMEOUT_MS. */
export function realDataTestsWithoutTimeout(source: string): number[] {
  const lines: number[] = [];
  for (const match of source.matchAll(OPENS_IT)) {
    const call = callAt(source, (match.index ?? 0) + match[0].length - 1);
    if (!RUNS.test(call) || !REAL.test(call)) continue;
    if (TIMEOUT.test(call)) continue;
    lines.push(source.slice(0, match.index).split('\n').length);
  }
  return lines;
}

describe('the timeout of a test that runs the ship or the align-choose listing over the real data', () => {
  it('is 10 * HOOK_TIMEOUT_MS, as its beforeAll has, in every unit test', () => {
    const offences: string[] = [];
    for (const name of readdirSync(DIR).filter((n) => /\.test\.tsx?$/.test(n) && n !== 'real-data-test-timeouts.test.ts')) {
      for (const line of realDataTestsWithoutTimeout(readFileSync(join(DIR, name), 'utf8'))) offences.push(`${DIR}/${name}:${line} has no timeout of its own`);
    }
    expect(offences).toEqual([]);
  });

  it('sees the shape that failed: an it() that lists a real chapter and ends with no timeout', () => {
    const failed = "it('lists Genesis 27', async () => {\n  await runAlignChoose(['--list'], { ship: sources, print: () => undefined });\n});";
    expect(realDataTestsWithoutTimeout(failed)).toEqual([1]);
    expect(realDataTestsWithoutTimeout(failed.replace(/\}\);$/, '}, 10 * HOOK_TIMEOUT_MS);'))).toEqual([]);
    expect(realDataTestsWithoutTimeout(failed.replace('ship: sources', 'ship: { morpheusDir }'))).toEqual([]);
  });
});
