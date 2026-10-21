// @vitest-environment node
// MW_TIMING (millwright docs/timing-tests.md): the rig's timing_tests leave the gate under MW_TIMING=skip and are the only
// tests under MW_TIMING=only. Both configs read the variables through pwa-kit/test-preset (mw-5r3p30.712). Importing a config
// reads the environment, hence resetModules.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaywrightTestConfig } from '@playwright/test';

const TIMING_SPEC = 'tests/e2e/turn-pages-trace.spec.ts';
const UNIT_FILE = 'tests/unit/config.test.ts';

type Env = Record<string, string | undefined>;

async function loadPlaywright(env: Env): Promise<PlaywrightTestConfig> {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value as string);
  return (await import('../../playwright.config')).default;
}

async function loadVitest(env: Env) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value as string);
  return (await import('../../vitest.config')).default.test!;
}

const list = (value: unknown): string[] => ([] as string[]).concat((value ?? []) as string | string[]);

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe('the Playwright projects under MW_TIMING', () => {
  const GATE_PROJECTS = ['chromium', 'shots'];

  it('leave the timing specs out of chromium and shots with MW_TIMING=skip', async () => {
    const config = await loadPlaywright({ LAMPAS_E2E: undefined, MW_TIMING: 'skip', MW_TIMING_TESTS: TIMING_SPEC });
    for (const name of GATE_PROJECTS) {
      expect(list(config.projects?.find((p) => p.name === name)?.testIgnore), name).toContain(TIMING_SPEC);
    }
  });

  it('run only the timing specs in chromium and shots with MW_TIMING=only', async () => {
    const config = await loadPlaywright({ LAMPAS_E2E: undefined, MW_TIMING: 'only', MW_TIMING_TESTS: TIMING_SPEC });
    for (const name of GATE_PROJECTS) {
      expect(list(config.projects?.find((p) => p.name === name)?.testMatch), name).toEqual([TIMING_SPEC]);
    }
  });

  it('are as they were with MW_TIMING unset: no timing spec ignored', async () => {
    const config = await loadPlaywright({ LAMPAS_E2E: undefined, MW_TIMING: undefined, MW_TIMING_TESTS: TIMING_SPEC });
    for (const name of GATE_PROJECTS) {
      expect(list(config.projects?.find((p) => p.name === name)?.testIgnore), name).not.toContain(TIMING_SPEC);
    }
  });

  it('leave the live project alone', async () => {
    const config = await loadPlaywright({ LAMPAS_E2E: 'live', MW_TIMING: 'skip', MW_TIMING_TESTS: TIMING_SPEC });
    const live = config.projects?.find((p) => p.name === 'live');
    expect(list(live?.testMatch)).toEqual(['**/*-live.spec.ts']);
    expect(list(live?.testIgnore)).toEqual([]);
  });
});

describe('vitest under MW_TIMING', () => {
  it('leaves the named test file out with MW_TIMING=skip', async () => {
    const test = await loadVitest({ MW_TIMING: 'skip', MW_TIMING_TESTS: UNIT_FILE });
    expect(list(test.exclude)).toContain(UNIT_FILE);
    expect(list(test.include)).toContain('tests/unit/**/*.test.ts');
  });

  it('runs only the named test file with MW_TIMING=only', async () => {
    const test = await loadVitest({ MW_TIMING: 'only', MW_TIMING_TESTS: UNIT_FILE });
    expect(list(test.include)).toEqual([UNIT_FILE]);
  });

  it('never takes a Playwright spec as its own, and passes with no file when only timing specs are asked for', async () => {
    const test = await loadVitest({ MW_TIMING: 'only', MW_TIMING_TESTS: TIMING_SPEC });
    expect(list(test.exclude)).toContain('tests/e2e/**');
    expect(test.passWithNoTests).toBe(true);
    expect((await loadVitest({ MW_TIMING: undefined })).passWithNoTests).toBe(false);
  });

  it('is as it was with MW_TIMING unset', async () => {
    const test = await loadVitest({ MW_TIMING: undefined, MW_TIMING_TESTS: UNIT_FILE });
    expect(list(test.include)).toHaveLength(4);
    expect(list(test.exclude)).not.toContain(UNIT_FILE);
  });
});
