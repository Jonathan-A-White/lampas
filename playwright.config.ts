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

const LIVE_SPEC = '**/*-live.spec.ts';

// The live reading spec has no real microphone: Chromium's fake capture device plays this clip of Romans 8:28 read aloud
// (synthesized with espeak-ng) as the microphone's sound, and the page is allowed the microphone without a prompt.
const FAKE_MIC_CLIP = join(process.cwd(), 'tests', 'fixtures', 'read-8-28.wav');

// The live project drives the DEPLOYED app: Postern's CORS allows only https://lampas.allmymind.org, so a
// localhost preview could never reach the tutor. `npm run e2e:live` sets LAMPAS_E2E=live, and then no preview
// server is started (and nothing is built).
const LIVE_BASE_URL = process.env.LAMPAS_LIVE_URL || 'https://lampas.allmymind.org';
const LIVE_RUN = process.env.LAMPAS_E2E === 'live';

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
    // `npm run e2e:live` (--project=live): the specs (tests/e2e/*-live.spec.ts) that talk to the real Postern backend, through the
    // deployed app. It is in neither the gate nor `npm run shots`, and it spends a grind of fuel per run.
    {
      name: 'live',
      testMatch: LIVE_SPEC,
      timeout: 180_000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LIVE_BASE_URL,
        channel: 'chromium',
        viewport: { width: 390, height: 844 },
        permissions: ['microphone'],
        launchOptions: {
          env: browserEnv,
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${FAKE_MIC_CLIP}`],
        },
      },
    },
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
