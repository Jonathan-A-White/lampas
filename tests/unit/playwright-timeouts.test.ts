// tests/unit/playwright-timeouts.test.ts — playwright.config.ts takes the preset's budgets, and tests/support/timeouts.ts is their one source (mw-5r3p30.713).
// expect()'s own wait is 5 s unless the config says: a loaded host outran it in tests/e2e/study-resources.spec.ts and reopen.spec.ts.
import { describe, expect, it } from 'vitest';
import { playwrightTimeouts } from 'pwa-kit/test-preset';
import config from '../../playwright.config';
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
