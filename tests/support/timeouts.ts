// tests/support/timeouts.ts — the one wait every jsdom findBy* and waitFor uses (tests/setup.ts configures it; tests/unit/async-wait.test.ts holds it).
/** How long findBy*, findAllBy* and waitFor wait before they give up. */
export const ASYNC_WAIT_MS = 10_000;
