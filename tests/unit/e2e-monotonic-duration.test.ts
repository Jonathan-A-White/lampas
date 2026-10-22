// tests/unit/e2e-monotonic-duration.test.ts — a duration in a Playwright spec comes from performance.now(), not from two Date.now() reads (mw-5r3p30.723).
// WSL2 steps the wall clock back (about 1.4 s every 32 s): `Date.now() - lastChainAsk` then never reaches the 1.5 s of quiet a spec waits for, and the spec fails
// for a reason that is not the product (class wall-clock-duration, mw-fgl2s2.3). A timestamp offset into the past (`Date.now() - 60_000`) is not a duration and stays.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The names a file sets to a Date.now() reading: `let t = Date.now()`, `t = Date.now()` (also inside `(t = Date.now())`). */
function wallClockReads(source: string): Set<string> {
  return new Set([...source.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*Date\.now\(\)/g)].map((m) => m[1]));
}

/** The lines that subtract one of those readings from another Date.now(): a duration taken from two wall-clock reads. */
function wallClockDurations(source: string): string[] {
  const reads = wallClockReads(source);
  return source
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => [...line.matchAll(/Date\.now\(\)\s*-\s*([A-Za-z_$][\w$]*)\b/g)].some((m) => reads.has(m[1])))
    .map(({ line, n }) => `${n}: ${line.trim()}`);
}

describe('a duration in a Playwright spec', () => {
  it('is not taken from two Date.now() reads', () => {
    const offences = readdirSync('tests/e2e')
      .filter((name) => /\.tsx?$/.test(name))
      .flatMap((name) => wallClockDurations(readFileSync(join('tests/e2e', name), 'utf8')).map((hit) => `tests/e2e/${name}:${hit}`));
    expect(offences).toEqual([]);
  });

  it('sees the shape that went negative, and leaves a timestamp offset into the past alone', () => {
    expect(wallClockDurations('let lastChainAsk = Date.now();\nawait expect.poll(() => Date.now() - lastChainAsk).toBeGreaterThan(1500);')).toHaveLength(1);
    expect(wallClockDurations('const started = Date.now();\nconst took = Date.now() - started;')).toHaveLength(1);
    expect(wallClockDurations('const row = { due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000 };')).toEqual([]);
    expect(wallClockDurations('let t = performance.now();\nexpect(performance.now() - t).toBeGreaterThan(1500);')).toEqual([]);
  });
});
