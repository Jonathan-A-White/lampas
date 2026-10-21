// tests/support/timeouts.ts — the waits the tests share. The numbers are pwa-kit/test-preset's (one source; PROVISIONAL there), re-exported here
// under the names the tests already use (tests/unit/async-wait.test.ts, hook-timeouts.test.ts and playwright-timeouts.test.ts hold them).
import { ASYNC_WAIT_MS, HOOK_TIMEOUT_MS, playwrightTimeouts } from 'pwa-kit/test-preset';

/** How long every jsdom findBy*, findAllBy* and waitFor waits before it gives up (tests/setup.ts configures it); the library's own 1 s is outrun by a loaded host. */
export { ASYNC_WAIT_MS };

/**
 * How long a hook that removes a build's output, runs a build or starts a child process may take (mw-5r3p30.420).
 * vitest's hookTimeout is 10 s: a rmSync of two vite build dirs outran it on a loaded host (load ~5) and failed a whole run.
 * Give such a hook this as its last argument: `afterAll(() => rmSync(dir, { recursive: true, force: true }), HOOK_TIMEOUT_MS)`
 * (tests/unit/hook-timeouts.test.ts holds every one to it).
 */
export { HOOK_TIMEOUT_MS };

/** What a Playwright expect() waits (playwright.config.ts expect.timeout; its own is 5 s, which a loaded host outruns: mw-5r3p30.713). A spec never passes a shorter `timeout:`. */
export const PLAYWRIGHT_EXPECT_MS = playwrightTimeouts.expect.timeout;
/** How long a Playwright test may run (playwright.config.ts timeout). */
export const PLAYWRIGHT_TEST_MS = playwrightTimeouts.timeout;
