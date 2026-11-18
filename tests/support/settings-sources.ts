// tests/support/settings-sources.ts — where the settings sources lie, for a test that reads them as text or counts them (a path, not an import).
// tests/support/settings.ts re-exports it; a test that only needs a path imports this file and so does not load the registry.
/** Where the settings sources lie, for a test that reads them as text or counts them (a path, not an import). */
export const SETTINGS_SOURCE = {
  registry: 'src/settings/registry.ts',
  rows: 'src/settings/rows.ts',
  controlsDir: 'src/settings/controls',
  approachControl: 'src/settings/controls/approach.tsx',
} as const;
