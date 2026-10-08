import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { buildVersion, shortCommit } from './build-version';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion(pkg.version, new Date(), shortCommit())),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'features/steps/**/*.steps.ts',
      'features/steps/**/*.steps.tsx',
    ],
    // A few tests run a real vite build; capping workers keeps them from piling up and timing out.
    maxWorkers: 4,
    testTimeout: 20_000,
  },
});
