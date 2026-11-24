import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import noRawInterestWrite from './eslint-rules/no-raw-interest-write.js';
import noRealTimeWait from './eslint-rules/no-real-time-wait.js';
import noLayerInversion from './eslint-rules/no-layer-inversion.js';
import noNewRepositoryExports from './eslint-rules/no-new-repository-exports.js';

const local = { rules: { 'no-real-time-wait': noRealTimeWait, 'no-raw-interest-write': noRawInterestWrite, 'no-layer-inversion': noLayerInversion, 'no-new-repository-exports': noNewRepositoryExports } };

export default defineConfig([
  globalIgnores(['dist', 'shots', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended, // includes no-explicit-any
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // A test does not sleep in real time unless its line says why (eslint-rules/no-real-time-wait.js; old sleeps: eslint-suppressions.json).
    files: ['tests/**/*.{ts,tsx}', 'features/steps/**/*.{ts,tsx}'],
    plugins: { local },
    rules: { 'local/no-real-time-wait': 'error' },
  },
  {
    // A test puts a phone at a Greek or Hebrew level through tests/e2e/greek-start.ts, not by a bare write of the dial (eslint-rules/no-raw-interest-write.js; old writes: eslint-suppressions.json).
    files: ['tests/e2e/**/*.{ts,tsx}', 'features/steps/**/*.{ts,tsx}'],
    plugins: { local },
    rules: { 'local/no-raw-interest-write': 'error' },
  },
  {
    // A lower layer does not import a higher one: data < shared (ui, services) < features (eslint-rules/layers.js). Today's breaks are listed in eslint-rules/layer-inversions.json, a list that may only get shorter (tests/unit/layers.test.ts).
    files: ['src/**/*.{ts,tsx}'],
    plugins: { local },
    rules: { 'local/no-layer-inversion': 'error' },
  },
  {
    // The repositories barrel takes no new export: a new repository is imported from its own file (eslint-rules/no-new-repository-exports.js; what it exports today: eslint-rules/repository-exports.json, a list that may only get shorter).
    files: ['src/data/repositories/index.ts'],
    plugins: { local },
    rules: { 'local/no-new-repository-exports': 'error' },
  },
  {
    // A control file exports its controls and, beside each, the rows it draws (src/settings/controls/types.ts `draws`), which src/settings/controls/index.ts gathers by glob (mw-6ww.175.106); it is not a fast-refresh boundary.
    files: ['src/settings/controls/*.tsx', 'tests/fixtures/settings-controls*/**/*.tsx', 'tests/fixtures/settings-controls*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]);
