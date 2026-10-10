// tests/unit/async-wait.test.ts — a findBy*/waitFor in a test waits long enough for a loaded host (mw-5r3p30.142).
// The Laptop and the desktop run the suite with other work going; a step that waits for data (the New words strip needs the chapter,
// frequency.json and the word counts) at the library's 1 s, or at a short wait of its own, refuses an unrelated landing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getConfig } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ASYNC_WAIT_MS } from '../support/timeouts';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'e2e' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('the wait of findBy* and waitFor in jsdom tests', () => {
  it('is the shared ASYNC_WAIT_MS, at least 10 s, and below the test timeout', () => {
    expect(getConfig().asyncUtilTimeout).toBe(ASYNC_WAIT_MS);
    expect(ASYNC_WAIT_MS).toBeGreaterThanOrEqual(10_000);
    expect(ASYNC_WAIT_MS).toBeLessThan(20_000);
  });

  it('is not shortened by a test that passes its own timeout, and vi.waitFor always names one', () => {
    const offences: string[] = [];
    for (const file of [...sources('features'), ...sources('tests')]) {
      if (file.endsWith('async-wait.test.ts')) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\b(findBy\w+|findAllBy\w+|waitFor|waitForElementToBeRemoved)\(.*\btimeout:/.test(line)) offences.push(`${file}:${i + 1} passes its own timeout`);
          if (/\bvi\.waitFor\(/.test(line) && !/timeout/.test(line)) offences.push(`${file}:${i + 1} vi.waitFor at vitest's 1 s default`);
        });
    }
    expect(offences).toEqual([]);
  });
});
