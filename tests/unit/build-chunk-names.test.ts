// A deploy re-downloads only the code that changed (mw-5r3p30.277): the build's version stamp lives in index.html,
// not in a chunk, and node_modules libraries sit in a chunk of their own, so two builds of the same commit made at
// different times give every chunk the same file name (and so the same bytes).
import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dirs: string[] = [];
afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

// vite's own CLI in a child process: esbuild refuses to run inside the jsdom test environment.
function build(time: string): string {
  const outDir = mkdtempSync(join(tmpdir(), 'lampas-chunks-'));
  dirs.push(outDir);
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
    env: { ...process.env, LAMPAS_BUILD_TIME: time },
    stdio: 'inherit',
  });
  return outDir;
}

const scripts = (dir: string): string[] => readdirSync(join(dir, 'assets')).filter((name) => name.endsWith('.js')).sort();

describe('the build’s chunk names', () => {
  it('do not change with the time of the build, and the libraries have a chunk of their own', () => {
    const first = build('2026-10-13T10:00:00Z');
    const second = build('2026-10-13T10:07:00Z');

    expect(scripts(second)).toEqual(scripts(first));
    expect(readdirSync(join(second, 'assets')).sort()).toEqual(readdirSync(join(first, 'assets')).sort());

    const names = scripts(first);
    const main = names.find((name) => name.startsWith('index-'));
    const vendor = names.find((name) => name.startsWith('vendor-'));
    expect(main).toBeDefined();
    expect(vendor).toBeDefined();
    expect(readFileSync(join(first, 'assets', vendor as string), 'utf-8')).toMatch(/react/i);

    // The stamp is in index.html (an unhashed file) and in no script of the build.
    const stampOf = (dir: string): string => /__APP_VERSION__\s*=\s*("[^"]*")/.exec(readFileSync(join(dir, 'index.html'), 'utf-8'))?.[1] ?? '';
    expect(stampOf(first)).toContain('2026-10-13 10:00Z');
    expect(stampOf(second)).toContain('2026-10-13 10:07Z');
    for (const name of names) {
      expect(readFileSync(join(first, 'assets', name), 'utf-8')).not.toContain('2026-10-13 10:00Z');
    }
  }, 180_000);
});
