// @vitest-environment node
// tests/unit/vitest-timeouts.test.ts — vitest.config.ts takes the preset's budgets, and no file sets a shorter one (mw-indx1x6.25).
// A step of quiz-goal, practise, copy-hold, free-to-read, about-you, immersive-reader and lxx-ship outran the config's own 20 s on a host
// loaded to 14+ of 8 cores (mw-82lb97i.29, mw-indx1x6.24); pwa-kit/test-preset's vitestTimeouts is the one source of the number.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { vitestTimeouts } from 'pwa-kit/test-preset';
import config from '../../vitest.config';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'e2e' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("vitest.config.ts's timeouts", () => {
  it("takes the preset's testTimeout, hookTimeout and expect.poll, not a number of its own", () => {
    expect(config.test?.testTimeout).toBe(vitestTimeouts.testTimeout);
    expect(config.test?.hookTimeout).toBe(vitestTimeouts.hookTimeout);
    expect(config.test?.expect?.poll?.timeout).toBe(vitestTimeouts.expect.poll.timeout);
  });

  it('keeps the test timeout above the 20 s it had', () => {
    expect(config.test?.testTimeout).toBeGreaterThan(20_000);
  });

  it("is not undercut by a file's own vi.setConfig({ testTimeout }) or { timeout } below the preset's", () => {
    const found: string[] = [];
    for (const dir of ['tests', 'features']) {
      for (const file of sources(dir)) {
        const text = readFileSync(file, 'utf8');
        for (const m of text.matchAll(/(?:testTimeout|timeout):\s*([\d_]+)(?!\s*\*)/g)) {
          const ms = Number(m[1].replace(/_/g, ''));
          const line = text.slice(0, m.index).split('\n').length;
          const text1 = text.split('\n')[line - 1];
          // a call's own `timeout:` that a findBy/waitFor takes is async-wait.test.ts's; here only a test's or setConfig's budget
          if (/setConfig|\bit\(|\btest\(|describe\(/.test(text1) && ms < vitestTimeouts.testTimeout) found.push(`${file}:${line}: ${text1.trim()}`);
        }
      }
    }
    expect(found).toEqual([]);
  });
});
