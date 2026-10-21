// tests/unit/playwright-timeouts.test.ts — playwright.config.ts takes the preset's budgets, and tests/support/timeouts.ts is their one source (mw-5r3p30.713).
// expect()'s own wait is 5 s unless the config says: a loaded host outran it in tests/e2e/study-resources.spec.ts and reopen.spec.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { playwrightTimeouts } from 'pwa-kit/test-preset';
import config from '../../playwright.config';
import { shortUncommentedTimeouts } from '../support/short-timeouts';
import { ASYNC_WAIT_MS, HOOK_TIMEOUT_MS, PLAYWRIGHT_EXPECT_MS, PLAYWRIGHT_TEST_MS } from '../support/timeouts';

describe("playwright.config.ts's waits", () => {
  it("sets expect.timeout from the preset, well past Playwright's 5 s", () => {
    expect(config.expect?.timeout).toBe(playwrightTimeouts.expect.timeout);
    expect(config.expect?.timeout).toBeGreaterThanOrEqual(20_000);
    expect(PLAYWRIGHT_EXPECT_MS).toBe(config.expect?.timeout);
  });

  it("keeps the test timeout at the preset's, at least the 60 s it had", () => {
    expect(config.timeout).toBe(playwrightTimeouts.timeout);
    expect(PLAYWRIGHT_TEST_MS).toBe(config.timeout);
    expect(PLAYWRIGHT_TEST_MS).toBeGreaterThanOrEqual(60_000);
  });

  it('has one source for the other waits: tests/support/timeouts.ts is the preset, not a second set of numbers', async () => {
    const preset = await import('pwa-kit/test-preset');
    expect(ASYNC_WAIT_MS).toBe(preset.ASYNC_WAIT_MS);
    expect(HOOK_TIMEOUT_MS).toBe(preset.HOOK_TIMEOUT_MS);
  });
});

describe("a spec's own per-call `timeout:` (mw-5r3p30.716)", () => {
  it('is flagged when it is under 10 s and its line has no comment saying why it is short', () => {
    const found = shortUncommentedTimeouts([
      "await expect(a).toBeVisible({ timeout: 5000 });",
      "await expect(b).toHaveCount(0, { timeout: 1000 });",
      "await expect(c).toBeVisible({ timeout: 5_000 });",
      "await expect(d).toBeVisible({ timeout: 9 * 1000 });",
      "await expect(e).toBeVisible({ timeout: 9999 }); //",
    ].join('\n'));
    expect(found.map((f) => f.line)).toEqual([1, 2, 3, 4, 5]);
  });

  it('is let through when it is 10 s or more, is not a number, or says on its line why it is short', () => {
    const found = shortUncommentedTimeouts([
      "await expect(a).toBeVisible({ timeout: 10_000 });",
      "await expect(b).toBeVisible({ timeout: 15_000 });",
      "await expect(c).toBeVisible({ timeout: PLAYWRIGHT_EXPECT_MS });",
      "await expect(d).toHaveCount(0, { timeout: 1000 }); // a window in which nothing must happen",
      "await expect(e).toBeVisible(); // { timeout: 1000 } was too short",
    ].join('\n'));
    expect(found).toEqual([]);
  });

  it('is nowhere in tests/e2e under 10 s without a comment on its line: wait on the condition under the config\'s budget, or say why the window is short', () => {
    const dir = join(__dirname, '..', 'e2e');
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    const found = files.flatMap((f) =>
      shortUncommentedTimeouts(readFileSync(join(dir, f), 'utf8')).map((hit) => `tests/e2e/${f}:${hit.line}: ${hit.text}`),
    );
    expect(found).toEqual([]);
  });
});
