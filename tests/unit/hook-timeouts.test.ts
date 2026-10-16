// tests/unit/hook-timeouts.test.ts — a hook that deletes files, builds or runs a child process names its own timeout (mw-5r3p30.420).
// vitest gives a hook 10 s. The afterAll of build-chunk-names.test.ts (rmSync of two vite build dirs) outran it on a loaded
// host (load ~5, suite 762 s) and failed a whole merged-tests run, though nothing it tested was wrong.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'e2e' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const HOOK = /\b(?:beforeAll|afterAll|beforeEach|afterEach|AfterAllScenarios|BeforeAllScenarios|AfterEachScenario|BeforeEachScenario)\(/g;
// `.exec(` is a regex's, not a child process's.
const HEAVY = /\b(?:rmSync|execFileSync|execSync|spawnSync)\(|(?<![.\w])(?:rm|execFile|exec|spawn|fork|build)\(|vite\.js/;

/** The text of the call that opens at `open` (the index of its "("), up to its closing ")". */
function callAt(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '(') depth++;
    if (source[i] === ')' && --depth === 0) return source.slice(open, i + 1);
  }
  return source.slice(open);
}

/** The hooks of one source that do heavy work and end with no timeout argument. */
export function hooksWithoutTimeout(source: string): number[] {
  const lines: number[] = [];
  for (const match of source.matchAll(HOOK)) {
    const call = callAt(source, (match.index ?? 0) + match[0].length - 1);
    if (!HEAVY.test(call)) continue;
    if (/,\s*(?:HOOK_TIMEOUT_MS|\d[\d_]*)\s*,?\s*\)$/.test(call)) continue;
    lines.push(source.slice(0, match.index).split('\n').length);
  }
  return lines;
}

describe('the timeout of a hook that removes files, builds or runs a child process', () => {
  it('is HOOK_TIMEOUT_MS, well past the 10 s vitest allows a hook', () => {
    expect(HOOK_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
  });

  it('is named by every such hook in the unit tests and the feature steps', () => {
    const offences: string[] = [];
    for (const file of [...sources('features'), ...sources('tests')]) {
      if (file.endsWith('hook-timeouts.test.ts')) continue;
      for (const line of hooksWithoutTimeout(readFileSync(file, 'utf8'))) offences.push(`${file}:${line} has no timeout of its own`);
    }
    expect(offences).toEqual([]);
  });

  it('sees the shape that failed: an afterAll that removes build dirs and ends with no timeout', () => {
    const failed = "afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));";
    expect(hooksWithoutTimeout(failed)).toEqual([1]);
    expect(hooksWithoutTimeout(failed.replace(/\)\);$/, '), HOOK_TIMEOUT_MS);'))).toEqual([]);
    expect(hooksWithoutTimeout('afterAll(() => db.close());')).toEqual([]);
  });
});
