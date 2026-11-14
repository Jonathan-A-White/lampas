// The version he reads on Home and Unlock changes by itself with each deploy: its commit part is the
// checkout's HEAD at build time (build-version.ts), never a constant someone keeps by hand.
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildVersion, packageVersion, shortCommit } from '../../build-version';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string };

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf-8' }).trim();
}

describe('buildVersion', () => {
  it('is the package version, the UTC build time and the commit', () => {
    expect(buildVersion('0.1.0', new Date('2026-10-08T12:17:31Z'), 'abc1234')).toBe('0.1.0 · 2026-10-08 12:17Z · abc1234');
  });
});

describe('shortCommit', () => {
  it('follows the checkout: a new commit gives a new string', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-commit-'));
    git(dir, 'init', '-q');
    writeFileSync(join(dir, 'a'), '1');
    git(dir, 'add', 'a');
    git(dir, 'commit', '-q', '-m', 'one');
    const first = shortCommit(dir);
    expect(first).toBe(git(dir, 'rev-parse', '--short', 'HEAD'));
    writeFileSync(join(dir, 'a'), '2');
    git(dir, 'commit', '-q', '-am', 'two');
    const second = shortCommit(dir);
    expect(second).toBe(git(dir, 'rev-parse', '--short', 'HEAD'));
    expect(second).not.toBe(first);
  });

  it('is "dev" outside a checkout, never a throw', () => {
    expect(shortCommit(mkdtempSync(join(tmpdir(), 'lampas-nogit-')), 'git-that-does-not-exist')).toBe('dev');
  });
});

describe('the version the app is built with', () => {
  it('ends with this checkout’s HEAD, as the build read it', () => {
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+ · \d{4}-\d{2}-\d{2} \d{2}:\d{2}Z · [0-9a-f]{7,}$/);
    expect(__APP_VERSION__.startsWith(`${pkg.version} · `)).toBe(true);
    expect(__APP_VERSION__.endsWith(` · ${git('.', 'rev-parse', '--short', 'HEAD')}`)).toBe(true);
  });

  it('is stamped by vite.config.ts from shortCommit(), with no commit written into the source', () => {
    const config = readFileSync('vite.config.ts', 'utf-8');
    expect(config).toContain('buildVersion(version, buildTime(), shortCommit())');
    expect(config).toContain('packageVersion()');
    expect(config).not.toContain('pkg.version');
    for (const file of ['src/Reader.tsx', 'src/gate/Unlock.tsx', 'src/BuildVersion.tsx']) {
      expect(readFileSync(file, 'utf-8')).not.toMatch(/· [0-9a-f]{7}\b/);
    }
  });
});

// mw-6ww.175.54: a build stamped the version from the working package.json but the commit from HEAD, so a working
// file older than HEAD showed the old version beside the new commit (Postern's mw-6ww.175.36).
describe('packageVersion', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function checkout(): string {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-version-'));
    dirs.push(dir);
    git(dir, 'init', '-q');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '0.7.1' }));
    git(dir, 'add', 'package.json');
    git(dir, 'commit', '-q', '-m', 'one');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '0.7.2' }));
    git(dir, 'commit', '-q', '-am', 'two');
    return dir;
  }

  it('is the version HEAD holds when the working package.json is older and uncommitted', () => {
    const dir = checkout();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '0.7.1' }));
    expect(packageVersion(dir)).toBe('0.7.2');
  });

  it('is the working file version outside a git checkout', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-version-nogit-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    expect(packageVersion(dir, 'git-that-does-not-exist')).toBe('1.2.3');
  });
});
