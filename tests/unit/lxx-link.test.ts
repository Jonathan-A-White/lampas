// npm run lxx:link (scripts/lxx/link.ts; docs/lxx-derivation.md 'A model session', step 0; story mw-u2w5klk.288), in a temp dir: a fake source checkout beside a fake worktree.
import { existsSync, lstatSync, readFileSync, mkdirSync, mkdtempSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LINKS, SOURCE_CHECKOUT, runLink } from '../../scripts/lxx/link';

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
afterEach(() => rmSync(root, { recursive: true, force: true }));

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
