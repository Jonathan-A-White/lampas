import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { previewPort, reuseExistingPreview } from './tests/support/preview-port';

// One preview server per worktree: see tests/support/preview-port.ts.
const PREVIEW_PORT = previewPort(process.cwd());
const PREVIEW_BASE_URL = `http://localhost:${PREVIEW_PORT}`;

// Chromium may need libnspr4/libnss3/libasound2 from a local cache dir on a host with no sudo; where
// the dir is absent this is a no-op.
const extraLibDir = join(homedir(), '.cache', 'ms-playwright-system-libs', 'usr', 'lib', 'x86_64-linux-gnu');
const browserEnv = existsSync(extraLibDir)
  ? { ...process.env, LD_LIBRARY_PATH: [extraLibDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }
  : undefined;

const LIVE_SPEC = '**/tutor-live.spec.ts';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: PREVIEW_BASE_URL,
    trace: 'retain-on-failure',
    // A cached worker would serve a stale build to the next spec.
    serviceWorkers: 'block',
  },
  // channel: 'chromium' uses the full Chromium build rather than the headless-shell binary.
  projects: [
    {
      name: 'chromium',
      testIgnore: LIVE_SPEC,
      use: { ...devices['Desktop Chrome'], channel: 'chromium', launchOptions: { env: browserEnv } },
    },
    // `npm run shots` (--project=shots): every spec's end-of-test screenshot (tests/e2e/shot.ts)
    // is taken at a 390x844 phone width.
    {
      name: 'shots',
      testIgnore: LIVE_SPEC,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 390, height: 844 },
        launchOptions: { env: browserEnv },
      },
    },
    // `npm run e2e:live` (--project=live): the one spec that talks to the real Postern backend. It is in
    // neither the gate nor `npm run shots`, and it spends a grind of fuel per run.
    {
      name: 'live',
      testMatch: LIVE_SPEC,
      timeout: 180_000,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 390, height: 844 },
        launchOptions: { env: browserEnv },
      },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PREVIEW_PORT} --strictPort`,
    url: PREVIEW_BASE_URL,
    reuseExistingServer: reuseExistingPreview(),
    timeout: 60_000,
  },
});
