// tests/support/timeouts.ts — the one wait every jsdom findBy* and waitFor uses (tests/setup.ts configures it; tests/unit/async-wait.test.ts holds it).
/** How long findBy*, findAllBy* and waitFor wait before they give up. */
export const ASYNC_WAIT_MS = 10_000;

/**
 * How long a hook that removes a build's output, runs a build or starts a child process may take (mw-5r3p30.420).
 * vitest's hookTimeout is 10 s: a rmSync of two vite build dirs outran it on a loaded host (load ~5) and failed a whole run.
 * Give such a hook this as its last argument: `afterAll(() => rmSync(dir, { recursive: true, force: true }), HOOK_TIMEOUT_MS)`
 * (tests/unit/hook-timeouts.test.ts holds every one to it).
 */
export const HOOK_TIMEOUT_MS = 120_000;
