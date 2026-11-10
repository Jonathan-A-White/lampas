import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import noRealTimeWait from './eslint-rules/no-real-time-wait.js';

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
    plugins: { local: { rules: { 'no-real-time-wait': noRealTimeWait } } },
    rules: { 'local/no-real-time-wait': 'error' },
  },
]);
