// tests/support/child-build.ts — a real vite build in a child process (esbuild refuses to run inside jsdom), under one time budget (mw-gq6.986).
// Two builds took 34 s at a load of 20 and outran 180 s at 25 to 30 beside another session's suite (mw-5r3p30.754): the budget is
// CHILD_BUILD_MS for a build, a test around n builds gets childBuildTestMs(n), and a build that runs out says the host's load was why.
import { execFileSync } from 'node:child_process';
import { loadavg } from 'node:os';

/** How long one vite build in a child process may take before it is killed and called a loaded host's. */
export const CHILD_BUILD_MS = 240_000;

/** The time a test (vitest's testTimeout) that runs `builds` builds in a row is given: all of them at their budget, and a minute over. */
export const childBuildTestMs = (builds: number): number => builds * CHILD_BUILD_MS + 60_000;

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
  try {
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
      timeout: CHILD_BUILD_MS,
    });
  } catch (error) {
    throw explainBuildFailure(error, loadavg().map((n) => Math.round(n * 10) / 10), CHILD_BUILD_MS);
  }
}
