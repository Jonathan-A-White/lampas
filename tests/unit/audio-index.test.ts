// The index of the recorded voice's timings is made from the book files, not edited by each book's story (mw-zbgo4ep.49; docs/audio-run.md 'Promoting a book'): two books'
// branches never touch one file, so they land at once and in any order. Reads committed files and runs git in a temp dir; no model and no audio.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { isTimingsIndex, TIMINGS_EDITION } from '../../src/data/audioTimings';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { checkIndex, indexText, writeIndex } from '../../scripts/audio-index.mjs';

const root = resolve(__dirname, '../..');
const DIR = `public/data/audio/${TIMINGS_EDITION}`;
const tools = 'scripts/audio-timings';
/** What one book's story writes besides its timings: each under a folder of its own, named by the book. */
const PER_BOOK = ['quiet', 'listen', 'judged'].map((kind) => ({ dir: `${tools}/${kind}`, file: (book: string) => `${tools}/${kind}/${TIMINGS_EDITION}-${book}.json` }));
const BOOK_FILES = (book: string): string[] => [`${DIR}/${book}.json`, ...PER_BOOK.map((p) => p.file(book))];

function git(cwd: string, ...args: string[]): { status: number | null; out: string } {
  const run = spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
}
const must = (cwd: string, ...args: string[]): string => {
  const done = git(cwd, ...args);
  if (done.status !== 0) throw new Error(`git ${args.join(' ')}: ${done.out}`);
  return done.out;
};

describe('index.json is derived, not edited', () => {
  it('is what the book files make (the gate checks it: node scripts/audio-index.mjs --check)', () => {
    expect(checkIndex(resolve(root, DIR))).toBeNull();
    const index: unknown = JSON.parse(readFileSync(resolve(root, `${DIR}/index.json`), 'utf8'));
    expect(isTimingsIndex(index)).toBe(true);
  });

  it('lists every <book>.json beside it, with the chapters that file holds, and nothing else', () => {
    const index = JSON.parse(indexText(resolve(root, DIR))) as { books: Record<string, number[]> };
    const files = readdirSync(resolve(root, DIR)).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => f.slice(0, -5));
    expect(Object.keys(index.books)).toEqual([...files].sort());
    for (const [book, chapters] of Object.entries(index.books)) {
      const timings = JSON.parse(readFileSync(resolve(root, `${DIR}/${book}.json`), 'utf8')) as { chapters: Record<string, unknown> };
      expect(chapters).toEqual(Object.keys(timings.chapters).map(Number).sort((a, b) => a - b));
    }
  });

  it('is not tracked by git: it is in .gitignore, so no branch can carry it', () => {
    expect(readFileSync(resolve(root, '.gitignore'), 'utf8').split('\n')).toContain(`${DIR}/index.json`);
    const tracked = git(root, 'ls-files', '--', `${DIR}/index.json`);
    if (tracked.status === 0) expect(tracked.out.trim()).toBe('');
  });

  it('is made by the build and by the development server, and is no longer written by the timing maker', () => {
    const scripts = (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts.build).toContain('scripts/audio-index.mjs');
    expect(scripts.predev).toContain('scripts/audio-index.mjs');
    expect(scripts['audio:index']).toContain('scripts/audio-index.mjs');
    expect(readFileSync(resolve(root, `${tools}/align.py`), 'utf8')).not.toMatch(/index_path|write_json\(index/);
  });

  it('refuses a book file that is not that book\'s timings, and an emptied one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'audio-index-bad-'));
    try {
      writeFileSync(join(dir, 'abc.json'), JSON.stringify({ v: 1, edition: TIMINGS_EDITION, book: 'xyz', chapters: { 1: {} } }));
      expect(() => indexText(dir)).toThrow(/abc\.json is not the msb-david timings of book abc/);
      writeFileSync(join(dir, 'abc.json'), JSON.stringify({ v: 1, edition: TIMINGS_EDITION, book: 'abc', chapters: {} }));
      expect(() => indexText(dir)).toThrow(/holds no chapter/);
      rmSync(join(dir, 'abc.json'));
      expect(JSON.parse(indexText(dir)).books).toEqual({});
      expect(checkIndex(dir)).toMatch(/missing/);
      writeIndex(dir);
      expect(checkIndex(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("a book's story writes only its own files", () => {
  it('every tracked file of the quiet, listen and judged folders is one book\'s, named for it', () => {
    for (const { dir } of PER_BOOK) {
      const names = readdirSync(resolve(root, dir));
      expect(names.length, dir).toBeGreaterThan(0);
      for (const name of names) expect(name, dir).toMatch(new RegExp(`^${TIMINGS_EDITION}-[0-9a-z]{3}\\.json$`));
    }
  });

  it('every book that has timings has its quiet, listen and judged files, and no file is another book\'s or without its timings', () => {
    const index = JSON.parse(indexText(resolve(root, DIR))) as { books: Record<string, number[]> };
    for (const book of Object.keys(index.books)) for (const file of BOOK_FILES(book)) expect(existsSync(resolve(root, file)), file).toBe(true);
    for (const { dir } of PER_BOOK) {
      for (const name of readdirSync(resolve(root, dir))) expect(Object.keys(index.books), `${dir}/${name} has no timings file`).toContain(name.slice(TIMINGS_EDITION.length + 1, -5));
    }
  });
});

describe('two books\' branches from one base merge in either order to the same index', () => {
  const work = mkdtempSync(join(tmpdir(), 'audio-index-merge-'));
  afterAll(() => rmSync(work, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

  /** A repo with the rig's own .gitignore and the books `have`, on a branch `main`. */
  function base(name: string, have: string[]): string {
    const repo = join(work, name);
    mkdirSync(repo, { recursive: true });
    must(repo, 'init', '-q', '-b', 'main');
    cpSync(resolve(root, '.gitignore'), join(repo, '.gitignore'));
    addBook(repo, have);
    must(repo, 'add', '-A');
    must(repo, 'commit', '-q', '-m', 'base');
    return repo;
  }
  function addBook(repo: string, books: string[]): void {
    for (const book of books) {
      for (const file of BOOK_FILES(book)) {
        mkdirSync(dirname(join(repo, file)), { recursive: true });
        cpSync(resolve(root, file), join(repo, file));
      }
    }
  }
  /** A book's story on its own branch: its files, the index made as a build would make it (it is ignored, so no commit carries it), one commit. */
  function story(repo: string, branch: string, books: string[]): void {
    must(repo, 'checkout', '-q', '-b', branch, 'main');
    addBook(repo, books);
    writeIndex(join(repo, DIR));
    must(repo, 'add', '-A');
    must(repo, 'commit', '-q', '-m', branch);
    expect(must(repo, 'ls-files', '--', `${DIR}/index.json`).trim(), 'no branch carries index.json').toBe('');
    must(repo, 'checkout', '-q', 'main');
  }
  function merged(name: string, order: string[]): { repo: string; tree: string } {
    const repo = base(name, ['gen', 'jhn']);
    story(repo, 'book-a', ['exo']);
    story(repo, 'book-b', ['lev']);
    story(repo, 'book-c', ['num']);
    for (const branch of order) must(repo, 'merge', '--no-edit', branch);
    return { repo, tree: must(repo, 'rev-parse', 'HEAD^{tree}').trim() };
  }

  it('merges all three books with no conflict, in both orders, to one tree and one index that passes the gate', () => {
    const forward = merged('forward', ['book-a', 'book-b', 'book-c']);
    const backward = merged('backward', ['book-c', 'book-b', 'book-a']);
    for (const { repo } of [forward, backward]) {
      writeIndex(join(repo, DIR));
      expect(checkIndex(join(repo, DIR))).toBeNull();
      const index: unknown = JSON.parse(readFileSync(join(repo, DIR, 'index.json'), 'utf8'));
      expect(isTimingsIndex(index)).toBe(true);
      if (!isTimingsIndex(index)) return;
      expect(Object.keys(index.books)).toEqual(['exo', 'gen', 'jhn', 'lev', 'num']);
      for (const book of Object.keys(index.books)) for (const file of BOOK_FILES(book)) expect(existsSync(join(repo, file)), file).toBe(true);
    }
    expect(readFileSync(join(forward.repo, DIR, 'index.json'), 'utf8')).toBe(readFileSync(join(backward.repo, DIR, 'index.json'), 'utf8'));
    expect(forward.tree).toBe(backward.tree);
  });

  it('would have conflicted had the index been a file each branch edits (the test is not vacuous)', () => {
    const repo = base('tracked', ['gen']);
    mkdirSync(join(repo, DIR), { recursive: true });
    writeFileSync(join(repo, DIR, 'index.json'), '{"books":{"gen":[1]}}\n');
    must(repo, 'add', '-f', '-A');
    must(repo, 'commit', '-q', '-m', 'tracked index');
    for (const [branch, line] of [['a', '{"books":{"gen":[1],"exo":[1]}}\n'], ['b', '{"books":{"gen":[1],"lev":[1]}}\n']] as const) {
      must(repo, 'checkout', '-q', '-b', branch, 'main');
      writeFileSync(join(repo, DIR, 'index.json'), line);
      must(repo, 'commit', '-q', '-am', branch);
      must(repo, 'checkout', '-q', 'main');
    }
    must(repo, 'merge', '--no-edit', 'a');
    expect(git(repo, 'merge', '--no-edit', 'b').status).not.toBe(0);
  });
});
