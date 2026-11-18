// scripts/numeral-sweep.ts answers --help and -h with its usage and an unknown flag with a stop, without rewriting docs/numeral-sweep.md (mw-ar5k42b.35).
// It runs in the repo's own cwd with --out nowhere: the proof is that the doc's bytes are the same after and that nothing named by --out appears.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { unknownArgument } from '../../scripts/numeral-sweep';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const ROOT = resolve(__dirname, '../..');
const TSX = join(ROOT, 'node_modules/.bin/tsx');
const work = mkdtempSync(join(tmpdir(), 'numeral-sweep-help-'));
const out = join(work, 'sweep.md');

afterAll(() => rmSync(work, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

const run = (...args: string[]) => spawnSync(TSX, ['scripts/numeral-sweep.ts', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });

describe('numeral-sweep.ts --help (mw-ar5k42b.35)', () => {
  it.each(['--help', '-h'])('%s prints the usage and exits 0 without writing', (flag) => {
    const before = readFileSync(join(ROOT, 'docs/numeral-sweep.md'), 'utf8');
    const r = run('--out', out, flag);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('numeral-sweep.ts');
    expect(existsSync(out)).toBe(false);
    expect(readFileSync(join(ROOT, 'docs/numeral-sweep.md'), 'utf8')).toBe(before);
  }, 60_000);

  it('an unknown flag names itself on stderr with the usage, exits 2 and writes nothing', () => {
    const r = run('--out', out, '--nonsense');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--nonsense');
    expect(r.stderr).toContain('numeral-sweep.ts');
    expect(existsSync(out)).toBe(false);
  }, 60_000);

  it('the two flags it takes, with their values, are known', () => {
    expect(unknownArgument([])).toBeUndefined();
    expect(unknownArgument(['--out', 'a.md', '--lxx', 'dir'])).toBeUndefined();
    expect(unknownArgument(['--lxx', 'dir', 'stray'])).toBe('stray');
  });
});
