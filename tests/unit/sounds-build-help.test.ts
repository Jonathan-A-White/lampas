// scripts/sounds-build.sh answers --help and -h with its usage and an unknown flag with a stop, without making or writing a clip (mw-ar5k42b.35).
// It runs in a temp copy of the tree (a git repo, committed) with espeak-ng and ffmpeg stubbed on PATH: a stub writes its name to a log, so a call is seen,
// and `git status --porcelain` of the copy and the absence of public/sounds show that nothing was written.
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const SCRIPT = resolve(__dirname, '../../scripts/sounds-build.sh');

let work = '';
let tree = '';
let stubs = '';
let log = '';

const git = (...args: string[]) => spawnSync('git', args, { cwd: tree, encoding: 'utf8', timeout: 20_000 });

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'sounds-build-help-'));
  tree = join(work, 'tree');
  stubs = join(work, 'stubs');
  log = join(work, 'calls.log');
  mkdirSync(join(tree, 'scripts'), { recursive: true });
  mkdirSync(stubs);
  writeFileSync(log, '');
  copyFileSync(SCRIPT, join(tree, 'scripts/sounds-build.sh'));
  chmodSync(join(tree, 'scripts/sounds-build.sh'), 0o755);
  for (const name of ['espeak-ng', 'ffmpeg']) {
    const file = join(stubs, name);
    writeFileSync(file, `#!/bin/sh\necho "${name} $*" >> "${log}"\nexit 0\n`);
    chmodSync(file, 0o755);
  }
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'tree');
});

afterAll(() => rmSync(work, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

function run(...args: string[]) {
  writeFileSync(log, '');
  // The stubs come first on PATH, then /usr/bin:/bin for sh and the helpers (mktemp, rm, mkdir): a stubbed name is never the real one.
  const result = spawnSync('/bin/sh', ['scripts/sounds-build.sh', ...args], {
    cwd: tree,
    encoding: 'utf8',
    env: { PATH: `${stubs}:/usr/bin:/bin`, HOME: work },
    timeout: 20_000,
  });
  return { ...result, calls: readFileSync(log, 'utf8').trim(), changed: git('status', '--porcelain').stdout.trim() };
}

describe('sounds-build.sh --help (mw-ar5k42b.35)', () => {
  it.each(['--help', '-h'])('%s prints the usage and exits 0 without making a clip', (flag) => {
    const r = run(flag);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('sounds-build.sh');
    expect(r.calls).toBe('');
    expect(existsSync(join(tree, 'public'))).toBe(false);
    expect(r.changed).toBe('');
  });

  it('an unknown flag names itself on stderr with the usage, exits 2 and writes nothing', () => {
    const r = run('--nonsense');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--nonsense');
    expect(r.stderr).toContain('sounds-build.sh');
    expect(r.calls).toBe('');
    expect(existsSync(join(tree, 'public'))).toBe(false);
    expect(r.changed).toBe('');
  });

  it('with no argument it makes the clips as before (each one an espeak-ng and an ffmpeg call)', () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.calls.split('\n').filter((l) => l.startsWith('espeak-ng'))).toHaveLength(5);
    expect(r.calls.split('\n').filter((l) => l.startsWith('ffmpeg'))).toHaveLength(5);
    expect(existsSync(join(tree, 'public/sounds/modern'))).toBe(true);
  });
});
