// scripts/language-parity-docs.ts answers --help and -h with its usage and an unknown flag with a stop, without rewriting docs/language-parity.md (mw-ar5k42b.35).
// It runs in a temp copy of what the script reads (itself, src/languages, tests/support, features, the doc) as a committed git repo whose doc is STALE: a run that
// went on to its normal job would rewrite it, and `git status --porcelain` and the doc's bytes show it did not.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const ROOT = resolve(__dirname, '../..');
const TSX = join(ROOT, 'node_modules/.bin/tsx');
const DOC = 'docs/language-parity.md';
const TABLE_START = readFileSync(join(ROOT, 'tests/support/parityTable.ts'), 'utf8').match(/TABLE_START = '([^']+)'/)?.[1] ?? '';

let work = '';
let tree = '';
let before = '';

const git = (...args: string[]) => spawnSync('git', args, { cwd: tree, encoding: 'utf8', timeout: 20_000 });

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'language-parity-docs-help-'));
  tree = join(work, 'tree');
  mkdirSync(join(tree, 'scripts'), { recursive: true });
  mkdirSync(join(tree, 'src'));
  mkdirSync(join(tree, 'tests'));
  mkdirSync(join(tree, 'docs'));
  cpSync(join(ROOT, 'scripts/language-parity-docs.ts'), join(tree, 'scripts/language-parity-docs.ts'));
  cpSync(join(ROOT, 'src/languages'), join(tree, 'src/languages'), { recursive: true });
  cpSync(join(ROOT, 'tests/support'), join(tree, 'tests/support'), { recursive: true });
  cpSync(join(ROOT, 'features'), join(tree, 'features'), { recursive: true });
  // The doc is made stale on purpose (a line added after the table's start marker), so only a run of the real job changes it.
  const doc = readFileSync(join(ROOT, DOC), 'utf8');
  expect(TABLE_START).not.toBe('');
  writeFileSync(join(tree, DOC), doc.replace(TABLE_START, `${TABLE_START}\nSTALE LINE`));
  symlinkSync(join(ROOT, 'node_modules'), join(tree, 'node_modules'));
  writeFileSync(join(tree, '.gitignore'), 'node_modules\n');
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'tree');
  before = readFileSync(join(tree, DOC), 'utf8');
}, HOOK_TIMEOUT_MS);

afterAll(() => rmSync(work, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

function run(...args: string[]) {
  const result = spawnSync(TSX, ['scripts/language-parity-docs.ts', ...args], { cwd: tree, encoding: 'utf8', timeout: 60_000 });
  return { ...result, changed: git('status', '--porcelain').stdout.trim() };
}

describe('language-parity-docs.ts --help (mw-ar5k42b.35)', () => {
  it('the stale doc is what the next test would rewrite (the fixture is honest)', () => {
    expect(existsSync(join(tree, DOC))).toBe(true);
    expect(before).toContain('STALE LINE');
  });

  it.each(['--help', '-h'])('%s prints the usage and exits 0 without rewriting the doc', (flag) => {
    const r = run(flag);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('language-parity-docs.ts');
    expect(readFileSync(join(tree, DOC), 'utf8')).toBe(before);
    expect(r.changed).toBe('');
  }, 60_000);

  it('an unknown flag names itself on stderr with the usage, exits 2 and writes nothing', () => {
    const r = run('--nonsense');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--nonsense');
    expect(r.stderr).toContain('language-parity-docs.ts');
    expect(readFileSync(join(tree, DOC), 'utf8')).toBe(before);
    expect(r.changed).toBe('');
  }, 60_000);

  it('with no argument it rewrites the doc as before', () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(readFileSync(join(tree, DOC), 'utf8')).not.toContain('STALE LINE');
  }, 60_000);
});
