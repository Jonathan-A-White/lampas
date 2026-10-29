import { configDefaults, defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { timingFilter } from 'pwa-kit/test-preset';
import { buildVersion, shortCommit } from './build-version';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// A grinds/ .md file is text the tests read by path, which `vitest related` cannot follow; read as a module it is the file's text,
// so a test can import it and `vitest related <that file>` selects the test (mw-5r3p30.860; a ?raw import never does, since vitest
// looks up the dependency's path with the query on it).
const grindsMarkdownAsText: Plugin = {
  name: 'grinds-markdown-as-text',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]grinds[\\/].*\.md$/.test(id)) return null;
    return { code: `export default ${JSON.stringify(code)};`, map: null };
  },
};

export default defineConfig({
  plugins: [react(), grindsMarkdownAsText],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion(pkg.version, new Date(), shortCommit())),
    // The plain version number (what changelog.json's versions are compared with), without the build's time and commit.
    __APP_SEMVER__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // MW_TIMING (millwright docs/timing-tests.md): the rig's timing_tests leave the gate under skip and are alone under only (mw-5r3p30.712).
    ...timingFilter({
      include: [
        'tests/unit/**/*.test.ts',
        'tests/unit/**/*.test.tsx',
        'features/steps/**/*.steps.ts',
        'features/steps/**/*.steps.tsx',
      ],
      // vitest's own default exclude (giving an exclude here would otherwise replace it), and the Playwright specs: under
      // MW_TIMING=only the include is the timing globs alone, and a timing spec in tests/e2e is Playwright's, not vitest's.
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    }),
    // MW_TIMING=only with timing tests that are all Playwright specs leaves vitest no file: that is a pass, not a failure.
    passWithNoTests: process.env.MW_TIMING === 'only',
    // A few tests run a real vite build; capping workers keeps them from piling up and timing out.
    maxWorkers: 4,
    testTimeout: 20_000,
    // Console lines go straight to the stream, not over the worker rpc: a line written as the worker closes (a failed
    // best-effort write after the last test) otherwise fails the run with EnvironmentTeardownError (mw-5r3p30.83).
    disableConsoleIntercept: true,
  },
});
