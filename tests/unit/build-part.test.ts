// A real vite build is a gate part of its own, not a test file in a shard (mw-5r3p30.1167): three gate failures came of it
// sharing a vitest shard with ~160 other files (mw-gq6.986, mw-5r3p30.420, mw-82lb97i.35).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILD_PART_ENV, BUILD_PART_FILES, BUILDS_IN_SHARDS, buildPartSelection } from '../support/build-part';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Code that runs a real build: the child-build helper's viteBuild, vite's own CLI, or `build` imported from 'vite'. */
export function runsABuild(source: string): boolean {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return /\bviteBuild\b/.test(code) || /vite\.js/.test(code) || /import\s*\{[^}]*\bbuild\b[^}]*\}\s*from\s*['"]vite['"]/.test(code);
}

describe('a real vite build runs in its own gate part', () => {
  it('the shards leave the build tests out, and the build part runs only them', () => {
    expect(buildPartSelection({})).toEqual({ only: null, exclude: BUILD_PART_FILES });
    expect(buildPartSelection({ [BUILD_PART_ENV]: 'build' })).toEqual({ only: BUILD_PART_FILES, exclude: [] });
    // The config cannot be imported here (esbuild refuses to run in jsdom): it must take its include and exclude from the selection.
    const config = readFileSync('vitest.config.ts', 'utf-8');
    expect(config).toMatch(/buildPartSelection\(process\.env\)/);
    expect(config).toMatch(/\.\.\.buildPart\.exclude/);
  });

  it('every build test in BUILD_PART_FILES exists and builds', () => {
    for (const file of BUILD_PART_FILES) expect(runsABuild(readFileSync(file, 'utf-8')), file).toBe(true);
  });

  it('no other unit test or step file runs a real build inside the shards', () => {
    const allowed = new Set([...BUILD_PART_FILES, ...BUILDS_IN_SHARDS]);
    // This file's own sample strings are builds to runsABuild.
    const builders = [...files('tests/unit'), ...files('features/steps')].filter((file) => file !== 'tests/unit/build-part.test.ts' && runsABuild(readFileSync(file, 'utf-8')));
    const strays = builders.filter((file) => !allowed.has(file));
    expect(strays, 'a test that builds goes in BUILD_PART_FILES (tests/support/build-part.ts), not in a shard').toEqual([]);
    for (const file of BUILDS_IN_SHARDS) expect(builders, `${file} no longer builds: remove it from BUILDS_IN_SHARDS`).toContain(file);
  });

  it('sees a build in code and not in a comment', () => {
    expect(runsABuild("import { viteBuild } from '../support/child-build';\nviteBuild(dir);")).toBe(true);
    expect(runsABuild("import { build } from 'vite';")).toBe(true);
    expect(runsABuild("execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'])")).toBe(true);
    expect(runsABuild('// viteBuild is the helper\nconst a = 1;')).toBe(false);
  });
});
