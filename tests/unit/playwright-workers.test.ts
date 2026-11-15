// tests/unit/playwright-workers.test.ts — playwright.config.ts reads JOBS (mw gives it builder_jobs) for its workers, so a run does not start half the host's cores in Chrome (mw-6ww.175.68).
import { afterEach, describe, expect, it, vi } from 'vitest';

async function configWith(jobs: string | undefined) {
  vi.resetModules();
  if (jobs === undefined) delete process.env.JOBS;
  else vi.stubEnv('JOBS', jobs);
  return (await import('../../playwright.config')).default;
}

describe("playwright.config.ts's workers", () => {
  const keptJobs = process.env.JOBS;
  afterEach(() => {
    vi.unstubAllEnvs();
    if (keptJobs === undefined) delete process.env.JOBS;
    else process.env.JOBS = keptJobs;
  });

  it('is the number in JOBS when it is set', async () => {
    expect((await configWith('2')).workers).toBe(2);
  });

  it("is left to Playwright's own default when JOBS is not set", async () => {
    expect((await configWith(undefined)).workers).toBeUndefined();
  });
});
