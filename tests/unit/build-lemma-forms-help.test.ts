// scripts/build-lemma-forms.mjs answers --help and -h with its usage and an unknown argument with a stop, without emptying or writing public/lemma-forms (mw-ar5k42b.41).
// It runs in a temp copy of the tree (a git repo, committed) whose public/lemma-forms holds a file and whose public/data has an empty index: a run that builds would
// empty the folder (and write its report), so `git status --porcelain --ignored` of the copy and the folder's file show that nothing was touched.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const SCRIPT = resolve(__dirname, '../../scripts/build-lemma-forms.mjs');

let work = '';
let tree = '';

const git = (...args: string[]) => spawnSync('git', args, { cwd: tree, encoding: 'utf8', timeout: 20_000 });
const status = () => git('status', '--porcelain', '--ignored').stdout.trim();

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'build-lemma-forms-help-'));
  tree = join(work, 'tree');
  mkdirSync(join(tree, 'scripts'), { recursive: true });
  mkdirSync(join(tree, 'public/data'), { recursive: true });
  mkdirSync(join(tree, 'public/lemma-forms'), { recursive: true });
  copyFileSync(SCRIPT, join(tree, 'scripts/build-lemma-forms.mjs'));
  writeFileSync(join(tree, 'public/data/index.json'), JSON.stringify({ books: [] }));
  writeFileSync(join(tree, 'public/lemma-forms/keep.json'), '{"l":"keep","f":[]}');
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'tree');
});

afterAll(() => rmSync(work, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

function run(...args: string[]) {
  const before = status();
  const result = spawnSync(process.execPath, ['scripts/build-lemma-forms.mjs', ...args], { cwd: tree, encoding: 'utf8', timeout: 20_000 });
  return { ...result, same: status() === before, files: readdirSync(join(tree, 'public/lemma-forms')) };
}

describe('build-lemma-forms.mjs --help (mw-ar5k42b.41)', () => {
  it.each(['--help', '-h'])('%s prints the usage and exits 0 without touching public/lemma-forms', (flag) => {
    const r = run(flag);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('build-lemma-forms.mjs');
    expect(r.files).toEqual(['keep.json']);
    expect(r.same).toBe(true);
    expect(status()).toBe('');
  });

  it('an unknown argument names itself on stderr with the usage, exits 2 and writes nothing', () => {
    const r = run('--nonsense');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--nonsense');
    expect(r.stderr).toContain('build-lemma-forms.mjs');
    expect(r.files).toEqual(['keep.json']);
    expect(r.same).toBe(true);
    expect(status()).toBe('');
  });

  it('with no argument it builds as before (the folder is made again from the data)', () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('0 lemma files');
    expect(existsSync(join(tree, 'public/lemma-forms/keep.json'))).toBe(false);
  });
});
