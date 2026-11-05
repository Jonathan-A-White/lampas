// A real vite build in a child process runs under a time budget, and a loaded host outruns it (mw-gq6.986: build-chunk-names took
// longer than 180 s twice on mw-5r3p30.754 at load 25 to 30, beside another session's suite). The budget is long, and a build that
// still runs out says the host's load was why; a build that fails for any other reason is not called a load problem.
import { describe, expect, it } from 'vitest';
import { CHILD_BUILD_MS, childBuildTestMs, explainBuildFailure } from '../support/child-build';

const timedOut = Object.assign(new Error('spawnSync node ETIMEDOUT'), { code: 'ETIMEDOUT' });

describe('the budget of a build in a child process', () => {
  it('is well past the 34 s two builds took at a load of 20, and the test around n builds outlasts them', () => {
    expect(CHILD_BUILD_MS).toBeGreaterThanOrEqual(180_000);
    expect(childBuildTestMs(2)).toBeGreaterThan(2 * CHILD_BUILD_MS);
    expect(childBuildTestMs(1)).toBeGreaterThan(CHILD_BUILD_MS);
  });

  it('names the host’s load when the build ran out of time', () => {
    const error = explainBuildFailure(timedOut, [27.5, 22.1, 14.9], 240_000);
    expect(error.message).toMatch(/240 s/);
    expect(error.message).toMatch(/load average 27\.5, 22\.1, 14\.9/);
    expect(error.message).toMatch(/host is loaded/);
  });

  it('leaves a build that failed for another reason as it was', () => {
    const failed = Object.assign(new Error('Command failed: vite build'), { status: 1 });
    expect(explainBuildFailure(failed, [27.5, 22.1, 14.9], 240_000)).toBe(failed);
  });
});
