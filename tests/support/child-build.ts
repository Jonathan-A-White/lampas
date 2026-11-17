// tests/support/child-build.ts — a real vite build in a child process (esbuild refuses to run inside jsdom), under one time budget (mw-gq6.986), which grows with the host's load (mw-indx1x6.77).
// Two builds took 34 s at a load of 20 and outran 180 s at 25 to 30 beside another session's suite (mw-5r3p30.754): the budget is
// CHILD_BUILD_MS for a build, a test around n builds gets childBuildTestMs(n), and a build that runs out says the host's load was why.
import { execFileSync } from 'node:child_process';
import { cpus, loadavg } from 'node:os';

/** How long one vite build in a child process may take before it is killed and called a loaded host's. */
export const CHILD_BUILD_MS = 240_000;

/** How many times CHILD_BUILD_MS a build may be given at most, on a host whose load per core is that high or higher (mw-indx1x6.77). */
export const CHILD_BUILD_MAX_SCALE = 4;

/**
 * The time one build may take on a host at this load: CHILD_BUILD_MS, and more by the load per core of the last minute or the
 * last five when it is over 1 (a gate part beside another session's suite outran 240 s: mw-indx1x6.77), up to CHILD_BUILD_MAX_SCALE.
 */
export function childBuildBudgetMs(load: readonly number[], cores: number): number {
  const perCore = Math.max(load[0] ?? 0, load[1] ?? 0) / Math.max(1, cores);
  return Math.round(CHILD_BUILD_MS * Math.min(CHILD_BUILD_MAX_SCALE, Math.max(1, perCore)));
}

/** The time a test (vitest's testTimeout) that runs `builds` builds in a row is given: all of them at their longest budget, and a minute over. */
export const childBuildTestMs = (builds: number): number => builds * CHILD_BUILD_MS * CHILD_BUILD_MAX_SCALE + 60_000;

/** The error to throw for a failed build: one that ran out of time names the load, any other is returned as it was. */
export function explainBuildFailure(error: unknown, load: readonly number[], budgetMs: number): Error {
  const code = (error as { code?: string } | null)?.code;
  if (code !== 'ETIMEDOUT') return error instanceof Error ? error : new Error(String(error));
  const [one, five, fifteen] = load;
  return new Error(
    `vite build did not finish in ${budgetMs / 1000} s (load average ${one}, ${five}, ${fifteen}): the host is loaded, ` +
      `not the build wrong; run this test alone or raise CHILD_BUILD_MS (tests/support/child-build.ts)`,
  );
}

/** `vite build` into `outDir` in a child process; `env` is added to the process's own. */
export function viteBuild(outDir: string, env: Record<string, string> = {}): void {
  const load = loadavg().map((n) => Math.round(n * 10) / 10);
  const budgetMs = childBuildBudgetMs(load, cpus().length);
  try {
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
      timeout: budgetMs,
    });
  } catch (error) {
    throw explainBuildFailure(error, load, budgetMs);
  }
}
