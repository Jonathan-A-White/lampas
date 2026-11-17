// tests/support/build-part.ts — the unit tests that run a real vite build are a gate part of their own (mw-5r3p30.1167).
// A build in a child process takes up to CHILD_BUILD_MS (240 s, more under load); beside ~160 other files in one vitest shard it outran
// the shard's budget three times (mw-gq6.986, mw-5r3p30.420, mw-82lb97i.35). So vitest.config.ts leaves these files out of the
// shards and runs only them when LAMPAS_TESTS=build: the gate's part is `TZ=UTC LAMPAS_TESTS=build npx vitest run`.

/** The unit test files that run a real vite build in a child process, run by the build part and by no shard. */
export const BUILD_PART_FILES: readonly string[] = ['tests/unit/build-chunk-names.test.ts'];

/**
 * Test files that run a real build and still sit in the shards: the feature steps are one scenario each in a feature spec and
 * cannot be taken out without taking the scenario. Not a place for a new file: a new test that builds goes in BUILD_PART_FILES.
 */
export const BUILDS_IN_SHARDS: readonly string[] = ['features/steps/data.steps.ts', 'features/steps/install.steps.tsx'];

/** The environment variable that picks the build part. */
export const BUILD_PART_ENV = 'LAMPAS_TESTS';

/** The include and exclude globs vitest.config.ts adds for the shards (no value) or the build part (`build`). */
export function buildPartSelection(env: Record<string, string | undefined>): { only: readonly string[] | null; exclude: readonly string[] } {
  return env[BUILD_PART_ENV] === 'build' ? { only: BUILD_PART_FILES, exclude: [] } : { only: null, exclude: BUILD_PART_FILES };
}
