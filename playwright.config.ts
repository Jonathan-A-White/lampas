import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { playwrightTimeouts, playwrightTimingFilter } from 'pwa-kit/test-preset';
import { browserEnv } from './tests/support/browser-env';
import { PHONE_WIDTH_SPECS } from './tests/support/e2e-projects';
import { previewPort, reuseExistingPreview } from './tests/support/preview-port';

// One preview server per worktree: see tests/support/preview-port.ts.
const PREVIEW_PORT = previewPort(process.cwd());
const PREVIEW_BASE_URL = `http://localhost:${PREVIEW_PORT}`;

// Specs import src/config.ts, whose __APP_SEMVER__ is a Vite define that Playwright's loader lacks: give it the
// package's version, as vite.config.ts does. Workers load this config too, so the global is set in each.
(globalThis as { __APP_SEMVER__?: string }).__APP_SEMVER__ = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

const LIVE_SPEC = '**/*-live.spec.ts';

// The live reading spec has no real microphone: Chromium's fake capture device plays this clip of Romans 8:28 read aloud
// (synthesized with espeak-ng) as the microphone's sound, and the page is allowed the microphone without a prompt.
const FAKE_MIC_CLIP = join(process.cwd(), 'tests', 'fixtures', 'read-8-28.wav');

// The live project drives the DEPLOYED app: Postern's CORS allows only https://lampas.allmymind.org, so a
// localhost preview could never reach the tutor. `npm run e2e:live` sets LAMPAS_E2E=live, and then no preview
// server is started (and nothing is built).
const LIVE_BASE_URL = process.env.LAMPAS_LIVE_URL || 'https://lampas.allmymind.org';
const LIVE_RUN = process.env.LAMPAS_E2E === 'live';

// The 1280-wide chromium project leaves out the specs that only pass at a phone's width (they run under shots).
const PHONE_WIDTH_IGNORE = PHONE_WIDTH_SPECS.map((file) => `**/${file}`);

// MW_TIMING (millwright docs/timing-tests.md): the specs in the rig's timing_tests leave the gate under MW_TIMING=skip and are the only ones under
// MW_TIMING=only. A project's own testMatch/testIgnore wins over the config's, so each gate project is filtered here. Playwright's own default
// testMatch is given, so a run with MW_TIMING unset matches what it did before. The live project is outside both runs (mw-5r3p30.712).
const DEFAULT_TEST_MATCH = '**/*.@(spec|test).?(c|m)[jt]s?(x)';

// `npm run e2e:live` (--project=live): the specs (tests/e2e/*-live.spec.ts) that talk to the real Postern backend, through the
// deployed app. It is in neither the gate nor `npm run shots`, and it spends a grind of fuel per run, so it is in the
// config only when LAMPAS_E2E=live: a plain `npx playwright test` runs neither it nor a live spec (mw-5r3p30.156).
const LIVE_PROJECT = {
  name: 'live',
  testMatch: LIVE_SPEC,
  timeout: 180_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: LIVE_BASE_URL,
    channel: 'chromium' as const,
    viewport: { width: 390, height: 844 },
    permissions: ['microphone'],
    launchOptions: {
      env: browserEnv,
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${FAKE_MIC_CLIP}`],
    },
  },
};

export default defineConfig({
  testDir: './tests/e2e',
  // The preset's budgets (tests/support/timeouts.ts re-exports them): timeout 60 s and expect.timeout 20 s, because the 5 s Playwright gives expect() was outrun on a loaded host.
  ...playwrightTimeouts,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: PREVIEW_BASE_URL,
    // A fresh phone is placed on the Greek dial at 0 (Just English, mw-3ased2.2); the specs before the dial expect the whole app, so they start at 5, All in (the seam in
    // src/data/repositories/greekInterest.ts, docs/testing.md). tests/e2e/greek-dial.spec.ts starts from an empty phone instead.
    storageState: { cookies: [], origins: [{ origin: PREVIEW_BASE_URL, localStorage: [{ name: 'lampas.greekInterestStart', value: '5' }] }] },
    trace: 'retain-on-failure',
    // A cached worker would serve a stale build to the next spec.
    serviceWorkers: 'block',
  },
  // channel: 'chromium' uses the full Chromium build rather than the headless-shell binary.
  projects: [
    {
      name: 'chromium',
      ...playwrightTimingFilter({ testMatch: [DEFAULT_TEST_MATCH], testIgnore: [LIVE_SPEC, ...PHONE_WIDTH_IGNORE] }),
      use: { ...devices['Desktop Chrome'], channel: 'chromium', launchOptions: { env: browserEnv } },
    },
    // `npm run shots` (--project=shots): every spec's end-of-test screenshot (tests/e2e/shot.ts)
    // is taken at a 390x844 phone width.
    {
      name: 'shots',
      ...playwrightTimingFilter({ testMatch: [DEFAULT_TEST_MATCH], testIgnore: [LIVE_SPEC] }),
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 390, height: 844 },
        launchOptions: { env: browserEnv },
      },
    },
    ...(LIVE_RUN ? [LIVE_PROJECT] : []),
  ],
  webServer: LIVE_RUN
    ? undefined
    : {
        command: `npm run preview -- --port ${PREVIEW_PORT} --strictPort`,
        url: PREVIEW_BASE_URL,
        reuseExistingServer: reuseExistingPreview(),
        timeout: 60_000,
      },
});
