// scripts/audio-timings/box-setup.sh answers --help and -h with its usage and an unknown flag with a stop, without acting on the box (mw-ar5k42b.20).
// The box's commands (uv, curl, wget, tar, ffmpeg, sudo, python3, apt-get, install, mkdir, ...) are stubs that write their name to a log, so a call is seen.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/audio-timings/box-setup.sh');
const STUBBED = ['uv', 'curl', 'wget', 'tar', 'ffmpeg', 'sudo', 'apt-get', 'python3', 'python', 'pip', 'install', 'mkdir', 'mktemp', 'nice', 'rm', 'mv', 'ln'];

let work = '';
let stubs = '';
let home = '';
let cache = '';
let log = '';

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'box-setup-help-'));
  stubs = join(work, 'stubs');
  home = join(work, 'home');
  cache = join(work, 'cache');
  log = join(work, 'calls.log');
  mkdirSync(stubs);
  mkdirSync(home);
  writeFileSync(log, '');
  for (const name of STUBBED) {
    const file = join(stubs, name);
    writeFileSync(file, `#!/bin/sh\necho "${name} $*" >> "${log}"\nexit 0\n`);
    chmodSync(file, 0o755);
  }
});

afterAll(() => rmSync(work, { recursive: true, force: true }));

function run(...args: string[]) {
  writeFileSync(log, '');
  // The stubs come first on PATH, then only /usr/bin:/bin for bash itself and the builtins' helpers (dirname, sed, cat): a stubbed name is never the real one.
  const result = spawnSync('/bin/bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { PATH: `${stubs}:/usr/bin:/bin`, HOME: home, LAMPAS_AUDIO_CACHE: cache },
    timeout: 20_000,
  });
  return { ...result, calls: readFileSync(log, 'utf8').trim() };
}

describe('box-setup.sh --help (mw-ar5k42b.20)', () => {
  it.each(['--help', '-h'])('%s prints the usage and exits 0 without touching the box', (flag) => {
    const r = run(flag);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('box-setup.sh');
    expect(r.stdout).toContain('LAMPAS_AUDIO_CACHE');
    expect(r.calls).toBe('');
    expect(existsSync(cache)).toBe(false);
    expect(readdirSync(home)).toEqual([]);
  });

  it('an unknown flag prints the usage to stderr and exits 2 without touching the box', () => {
    const r = run('--nonsense');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--nonsense');
    expect(r.stderr).toContain('box-setup.sh');
    expect(r.calls).toBe('');
    expect(existsSync(cache)).toBe(false);
    expect(readdirSync(home)).toEqual([]);
  });

  it('a stray argument is refused the same way, not taken for a request to set up', () => {
    const r = run('john');
    expect(r.status).toBe(2);
    expect(r.calls).toBe('');
    expect(existsSync(cache)).toBe(false);
  });
});
