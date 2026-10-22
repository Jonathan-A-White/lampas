// tests/unit/playwright-loads-specs.test.ts — Playwright's runner can load every spec and every app module a spec reaches (mw-5r3p30.729).
// Vite and vitest take `import x from './a.json'`; Playwright loads a spec under Node's ESM, which refuses a JSON module with no `with { type: 'json' }`, and the
// shots project died before any test (src/resources/catalogue.ts, mw-rfjjzd.2; the landing gate never runs a Playwright project). `--list` loads every spec
// file without a browser or the preview server, so a JSON import without the attribute anywhere a spec reaches fails here, naming the file.
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function list(project: string) {
  const run = spawnSync('npx', ['playwright', 'test', `--project=${project}`, '--list'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

describe('Playwright loading the specs', () => {
  it.each(['chromium', 'shots'])('lists the tests of the %s project with no load error', (project) => {
    const { status, output } = list(project);
    expect(output).not.toMatch(/import attribute/);
    expect(output).not.toMatch(/Error/);
    expect(status).toBe(0);
    expect(output).toMatch(/Total: [1-9]\d* tests? in/);
  }, 60_000);
});
