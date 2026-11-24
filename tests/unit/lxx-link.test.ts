// npm run lxx:link (scripts/lxx/link.ts; docs/lxx-derivation.md 'A model session', step 0; story mw-u2w5klk.288), in a temp dir: a fake source checkout beside a fake worktree.
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, mkdirSync, mkdtempSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { MANIFEST, packSources } from '../../scripts/lxx/archive';
import { LINKS, SOURCE_CHECKOUT, runLink } from '../../scripts/lxx/link';
import { sourcesGuard } from '../../scripts/lxx/sources';

let root: string;
let source: string;
let tree: string;

function run(args: string[] = [], opts: { source?: string; cwd?: string } = {}): { code: number; lines: string[] } {
  const lines: string[] = [];
  const code = runLink(args, { cwd: opts.cwd ?? tree, source: opts.source ?? source, log: (l) => lines.push(l) });
  return { code, lines };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'lxx-link-'));
  source = join(root, 'source');
  tree = join(root, 'worktree');
  for (const rel of LINKS) mkdirSync(join(source, rel), { recursive: true });
  mkdirSync(join(tree, 'data', 'lxx'), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

describe('lxx:link', () => {
  it('names the two git-ignored directories and the Laptop checkout', () => {
    expect([...LINKS]).toEqual(['data/raw', 'data/lxx/morpheus']);
    expect(SOURCE_CHECKOUT).toBe('/home/jwhite/lampas');
  });

  it('symlinks data/raw and data/lxx/morpheus from the source checkout and prints each link made', () => {
    const { code, lines } = run();
    expect(code).toBe(0);
    for (const rel of LINKS) {
      expect(isLink(join(tree, rel))).toBe(true);
      expect(readlinkSync(join(tree, rel))).toBe(join(source, rel));
      expect(lines.some((l) => l.includes('linked') && l.includes(rel))).toBe(true);
    }
  });

  it('is idempotent: a second run changes nothing and says so', () => {
    run();
    const { code, lines } = run();
    expect(code).toBe(0);
    expect(lines.some((l) => /nothing changed/i.test(l))).toBe(true);
    expect(lines.some((l) => l.startsWith('linked'))).toBe(false);
    for (const rel of LINKS) expect(readlinkSync(join(tree, rel))).toBe(join(source, rel));
  });

  it('is a no-op with no source checkout: one line, exit 0, no link', () => {
    const { code, lines } = run([], { source: join(root, 'nowhere') });
    expect(code).toBe(0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/no source checkout/i);
    for (const rel of LINKS) expect(isLink(join(tree, rel))).toBe(false);
  });

  it('is a no-op when the cwd is the source checkout', () => {
    const { code, lines } = run([], { cwd: source });
    expect(code).toBe(0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/is the source checkout/i);
    for (const rel of LINKS) expect(isLink(join(source, rel))).toBe(false);
  });

  it('leaves a real directory alone and says so', () => {
    mkdirSync(join(tree, 'data', 'raw'), { recursive: true });
    const { code, lines } = run();
    expect(code).toBe(0);
    expect(isLink(join(tree, 'data/raw'))).toBe(false);
    expect(lines.some((l) => l.includes('data/raw') && /real/i.test(l))).toBe(true);
    expect(isLink(join(tree, 'data/lxx/morpheus'))).toBe(true);
  });

  it('skips a directory the source does not have, naming the command that makes the cache', () => {
    rmSync(join(source, 'data/lxx/morpheus'), { recursive: true });
    const { code, lines } = run();
    expect(code).toBe(0);
    expect(isLink(join(tree, 'data/lxx/morpheus'))).toBe(false);
    expect(lines.some((l) => l.includes('data/lxx/morpheus') && l.includes('lxx:derive'))).toBe(true);
    expect(isLink(join(tree, 'data/raw'))).toBe(true);
  });

  it('--unlink removes the symlinks it made', () => {
    run();
    const { code, lines } = run(['--unlink']);
    expect(code).toBe(0);
    for (const rel of LINKS) {
      expect(isLink(join(tree, rel))).toBe(false);
      expect(lines.some((l) => l.includes('unlinked') && l.includes(rel))).toBe(true);
    }
    expect(existsSync(join(source, 'data/raw'))).toBe(true);
  });

  it('--unlink leaves a real directory, and a symlink to somewhere else, untouched', () => {
    mkdirSync(join(tree, 'data', 'raw'));
    writeFileSync(join(tree, 'data', 'raw', 'keep.txt'), 'mine');
    const elsewhere = join(root, 'elsewhere');
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, join(tree, 'data', 'lxx', 'morpheus'));
    const { code } = run(['--unlink']);
    expect(code).toBe(0);
    expect(existsSync(join(tree, 'data', 'raw', 'keep.txt'))).toBe(true);
    expect(readlinkSync(join(tree, 'data', 'lxx', 'morpheus'))).toBe(elsewhere);
  });

  it('--unlink with nothing linked says so and exits 0', () => {
    const { code, lines } = run(['--unlink']);
    expect(code).toBe(0);
    expect(lines.some((l) => /nothing changed/i.test(l))).toBe(true);
  });

  it('refuses an argument it does not know', () => {
    const { code, lines } = run(['--frob']);
    expect(code).toBe(1);
    expect(lines.join('\n')).toMatch(/--frob/);
  });

  it('is an npm script, named by the docs and by the model-story template as step one', () => {
    const scripts = (JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['lxx:link']).toBe('tsx scripts/lxx/link.ts');
    const docs = readFileSync('docs/lxx-derivation.md', 'utf8');
    expect(docs).toMatch(/0\. .*`npm run lxx:link`/);
    expect(docs).toMatch(/\*What:\* first run `npm run lxx:link`/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------- the archive (story mw-u2w5klk.381)

/** A small fixture checkout: what the Laptop has, in miniature, packed into an archive with its sha256 manifest. */
function fixtureArchive(): { archive: string; files: string[] } {
  const laptop = join(root, 'laptop');
  const files = ['data/raw/lxx/eliranwong/LXX-Swete-1930/abc/words.csv', 'data/raw/lxx/STEPBible/def/tagnt.txt', 'data/lxx/morpheus/gen.tsv', 'data/lxx/morpheus/jdg.tsv'];
  for (const f of files) {
    mkdirSync(join(laptop, f, '..'), { recursive: true });
    writeFileSync(join(laptop, f), `contents of ${f}\nλόγος\n`);
  }
  const archive = join(root, 'lxx-sources.tar.gz');
  const lines: string[] = [];
  expect(packSources(laptop, archive, (l) => lines.push(l))).toBe(0);
  expect(lines.join('\n')).toMatch(/sha256/);
  return { archive, files };
}

/** The archive with one byte of one file changed and the manifest left as it was (what a bad copy looks like). */
function corrupted(archive: string, file: string): string {
  const dir = join(root, 'tamper');
  mkdirSync(dir, { recursive: true });
  expect(spawnSync('tar', ['-xzf', archive, '-C', dir]).status).toBe(0);
  const text = readFileSync(join(dir, file), 'utf8');
  writeFileSync(join(dir, file), text.replace('contents', 'contentz'));
  const bad = join(root, 'bad.tar.gz');
  expect(spawnSync('tar', ['-czf', bad, '-C', dir, 'data', MANIFEST]).status).toBe(0);
  return bad;
}

describe('lxx:link --from <archive>', () => {
  const scratch = (): string => join(root, 'scratch');
  const store = (): string => join(root, 'store');
  const from = (archive: string, extra: string[] = []) =>
    run(['--from', archive, '--store', store(), ...extra], { source: join(root, 'no-laptop-checkout'), cwd: scratch() });
  beforeEach(() => mkdirSync(join(scratch(), 'data', 'lxx'), { recursive: true }));

  it('unpacks, verifies every file against the manifest, links the worktree to the store and exits 0, with no Laptop checkout', () => {
    const { archive, files } = fixtureArchive();
    const { code, lines } = from(archive);
    expect(code, lines.join('\n')).toBe(0);
    expect(lines.join('\n')).toMatch(new RegExp(`verified ${files.length} files`));
    for (const rel of LINKS) {
      expect(isLink(join(scratch(), rel))).toBe(true);
      expect(readlinkSync(join(scratch(), rel))).toBe(join(store(), rel));
    }
    for (const f of files) expect(readFileSync(join(scratch(), f), 'utf8')).toBe(`contents of ${f}\nλόγος\n`);
  });

  it('exits non-zero naming the file when one byte of one file is changed, and installs nothing', () => {
    const { archive, files } = fixtureArchive();
    const { code, lines } = from(corrupted(archive, files[2]));
    expect(code).not.toBe(0);
    expect(lines.join('\n')).toContain(files[2]);
    expect(lines.join('\n')).toMatch(/sha256 differs/);
    expect(existsSync(store())).toBe(false);
    for (const rel of LINKS) expect(isLink(join(scratch(), rel))).toBe(false);
  });

  it('names a file the manifest lists and the archive lacks, and a file the archive has and the manifest does not', () => {
    const { archive, files } = fixtureArchive();
    const dir = join(root, 'tamper2');
    mkdirSync(dir, { recursive: true });
    spawnSync('tar', ['-xzf', archive, '-C', dir]);
    rmSync(join(dir, files[3]));
    writeFileSync(join(dir, 'data/lxx/morpheus/extra.tsv'), 'x');
    const bad = join(root, 'bad2.tar.gz');
    spawnSync('tar', ['-czf', bad, '-C', dir, 'data', MANIFEST]);
    const { code, lines } = from(bad);
    expect(code).not.toBe(0);
    expect(lines.join('\n')).toContain(`${files[3]}: missing`);
    expect(lines.join('\n')).toContain('data/lxx/morpheus/extra.tsv: not in the manifest');
  });

  it('is idempotent: a second run finds the store already holding this archive and changes nothing', () => {
    const { archive } = fixtureArchive();
    expect(from(archive).code).toBe(0);
    const { code, lines } = from(archive);
    expect(code).toBe(0);
    expect(lines.join('\n')).toMatch(/already holds this archive/);
    expect(lines.join('\n')).toMatch(/already linked/);
  });

  it('refuses an archive that is not there, and --from with no archive', () => {
    expect(from(join(root, 'nothing.tar.gz')).code).not.toBe(0);
    const { code, lines } = run(['--from'], { cwd: scratch() });
    expect(code).toBe(1);
    expect(lines.join('\n')).toMatch(/--from/);
  });
});

describe('a host without the sources (story mw-u2w5klk.381)', () => {
  it('sourcesGuard gives one line that names npm run lxx:link when data/raw/lxx or the cache is not there, and nothing when both are', () => {
    const line = sourcesGuard('lxx:pending', ['--book', 'jdg', '--batch', '1'], root);
    expect(line).toMatch(/npm run lxx:link/);
    expect(line).not.toContain('\n');
    mkdirSync(join(root, 'data/raw/lxx'), { recursive: true });
    expect(sourcesGuard('lxx:pending', [], root)).toMatch(/data\/lxx\/morpheus/);
    mkdirSync(join(root, 'data/lxx/morpheus'), { recursive: true });
    expect(sourcesGuard('lxx:pending', [], root)).toBeUndefined();
  });

  it('--no-morpheus goes past it, as it does for the cache elsewhere', () => {
    expect(sourcesGuard('lxx:pending', ['--no-morpheus'], root)).toBeUndefined();
  });

  it('the five commands exit 1 with that one line on stderr from a directory with no sources', () => {
    const tsx = join(process.cwd(), 'node_modules', '.bin', 'tsx');
    const cases: Array<[string, string[]]> = [
      ['pending', ['--book', 'jdg', '--batch', '1']],
      ['choose', ['--book', 'jdg', '--batch', '1', '--from', 'x.tsv']],
      ['align', []],
      ['align-choose', ['--book', 'jdg']],
      ['unpaired', []],
    ];
    for (const [script, args] of cases) {
      const r = spawnSync(tsx, [join(process.cwd(), 'scripts', 'lxx', `${script}.ts`), ...args], { cwd: root, encoding: 'utf8' });
      expect(r.status, script).toBe(1);
      const out = (r.stderr + r.stdout).trim();
      expect(out.split('\n'), script).toHaveLength(1);
      expect(out, script).toContain('npm run lxx:link');
    }
  }, 60_000);
});
