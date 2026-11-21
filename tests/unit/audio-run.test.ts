// The whole-Bible run's parts (mw-ar5k42b.4, docs/audio-run.md): the shares of the 66 books for 5 boxes, the staged books (made by run-book.sh, NOT played by the app),
// and the one command's refusals. Reads committed files and runs the script only where it stops before any Python (no audio, no model).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const root = resolve(__dirname, '../..');
const tools = resolve(root, 'scripts/audio-timings');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
type Shares = { shares: { share: number; hours: number; chapters: number; books: string[] }[]; books: Record<string, { chapters: number; hours: number }> };
type Report = { timings: { sha256: string }; chapters: Record<string, unknown> };
const bookCodes = (): string[] => readJson<{ books: { code: string }[] }>(resolve(root, 'public/data/index.json')).books.map((b) => b.code);

describe('the shares (scripts/audio-timings/shares.json)', () => {
  const shares = readJson<Shares>(resolve(tools, 'shares.json'));
  const codes = bookCodes();

  it('are 5, and hold all 66 books once each', () => {
    expect(codes).toHaveLength(66);
    expect(shares.shares).toHaveLength(5);
    const all = shares.shares.flatMap((s) => s.books);
    expect(all).toHaveLength(66);
    expect([...all].sort()).toEqual([...codes].sort());
  });

  it('keep each share\'s books in the canon\'s order', () => {
    for (const share of shares.shares) {
      const at = share.books.map((b) => codes.indexOf(b));
      expect(at, share.books.join(' ')).toEqual([...at].sort((a, b) => a - b));
    }
  });

  it('are each within 10% of the mean hours of audio, and the hours add up', () => {
    const hours = shares.shares.map((s) => s.hours);
    const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
    for (const h of hours) expect(Math.abs(h / mean - 1)).toBeLessThan(0.1);
    for (const share of shares.shares) {
      const sum = share.books.reduce((a, b) => a + shares.books[b].hours, 0);
      expect(Math.abs(sum - share.hours)).toBeLessThan(0.05);
    }
  });

  it('count 1,189 chapters, the number of the publisher\'s files', () => {
    const chapters = shares.shares.reduce((a, s) => a + s.chapters, 0);
    expect(chapters).toBe(1189);
  });
});

describe('the staged books (scripts/audio-timings/staged/)', () => {
  const staged = join(tools, 'staged');
  const index = readJson<{ books: Record<string, number[]> }>(resolve(root, 'public/data/audio/msb-david/index.json'));
  const books = existsSync(join(staged, 'audio/msb-david'))
    ? readdirSync(join(staged, 'audio/msb-david')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
    : [];

  it('hold the Psalms and a one-chapter book of the story\'s proof', () => {
    expect(books).toContain('psa');
    expect(books.some((b) => ['jud', 'phm'].includes(b))).toBe(true);
  });

  for (const book of books) {
    it(`${book}: is judged as it stands (the report's sha256 is the timings') and is not in the app's index`, () => {
      const bytes = readFileSync(join(staged, `audio/msb-david/${book}.json`));
      const report = readJson<Report>(join(staged, `judged/msb-david-${book}.json`));
      expect(report.timings.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      expect(Object.keys(readJson<{ chapters: Record<string, unknown> }>(join(staged, `audio/msb-david/${book}.json`)).chapters).sort()).toEqual(Object.keys(report.chapters).sort());
      expect(existsSync(join(staged, `quiet/msb-david-${book}.json`))).toBe(true);
      expect(existsSync(join(staged, `listen/msb-david-${book}.json`))).toBe(true);
      expect(Object.keys(index.books)).not.toContain(book);
      expect(existsSync(resolve(root, `public/data/audio/msb-david/${book}.json`))).toBe(false);
    });
  }
});

describe('run-book.sh', () => {
  const made: string[] = [];
  afterEach(() => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  }, HOOK_TIMEOUT_MS);
  const run = (args: string[], cache?: string) => {
    const dir = mkdtempSync(join(tmpdir(), 'run-book-'));
    made.push(dir);
    const result = spawnSync('bash', [join(tools, 'run-book.sh'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, LAMPAS_AUDIO_CACHE: cache ?? join(dir, 'no-cache') },
    });
    return { status: result.status, output: `${result.stdout}${result.stderr}`, dir };
  };

  it('stops, writing nothing, with no book, a book that is not a code, or no set-up', () => {
    expect(run([]).status).toBe(2);
    expect(run(['john']).output).toMatch(/three-character code/);
    const noSetup = run(['jhn']);
    expect(noSetup.status).toBe(2);
    expect(noSetup.output).toMatch(/box-setup\.sh first/);
  });

  it('refuses an output folder under public/, before it writes there', () => {
    const before = readdirSync(resolve(root, 'public/data/audio/msb-david')).sort();
    const cache = mkdtempSync(join(tmpdir(), 'run-book-cache-'));
    made.push(cache);
    // a cache that looks set up, so the refusal under test is the one about the output
    spawnSync('bash', ['-c', `mkdir -p ${cache}/judge-venv/bin && printf '#!/bin/sh\\n' > ${cache}/judge-venv/bin/python && chmod +x ${cache}/judge-venv/bin/python`]);
    const refused = run(['jhn', '--out', resolve(root, 'public/data/audio/msb-david/oops')], cache);
    expect(refused.status).toBe(2);
    expect(refused.output).toMatch(/may not be under public/);
    expect(readdirSync(resolve(root, 'public/data/audio/msb-david')).sort()).toEqual(before);
  });

  // mw-zbgo4ep.61: the default staging folder is the cache's, outside the worktree, and the summary line is of one fixed form.
  // --summary-only runs nothing: it reads the book's files already in the folder, so these need no audio and no model.
  const SUMMARY = /^SUMMARY book=([0-9a-z]{3}) chapters=(\d+)\/(\d+) left_out=(none|\d+(?:,\d+)*) not_judged=(none|\d+(?:,\d+)*) verses=(\d+) flags=(\d+) flags_outside_list=(\d+) every_flag_on_list=(yes|no) listen_edges=(\d+) minutes=(\d+\.\d)$/;
  const parse = (line: string) => {
    const m = SUMMARY.exec(line);
    if (!m) throw new Error(`not the fixed summary line: ${line}`);
    return { book: m[1], timed: +m[2], of: +m[3], leftOut: m[4], notJudged: m[5], verses: +m[6], flags: +m[7], outside: +m[8], onList: m[9] === 'yes', edges: +m[10], minutes: +m[11] };
  };
  // a cache that looks set up: the judge's python is the box's python3, the only part --summary-only runs
  const fakeCache = () => {
    const cache = mkdtempSync(join(tmpdir(), 'run-book-cache-'));
    made.push(cache);
    mkdirSync(join(cache, 'judge-venv/bin'), { recursive: true });
    symlinkSync(spawnSync('bash', ['-c', 'command -v python3'], { encoding: 'utf8' }).stdout.trim(), join(cache, 'judge-venv/bin/python'));
    return cache;
  };
  const rutChapters = readdirSync(resolve(root, 'public/data/rut')).filter((f) => /^\d+\.json$/.test(f)).map((f) => parseInt(f, 10)).sort((a, b) => a - b);
  // the three files the summary reads, for Ruth with the given chapters timed and judged and the given verses' flags
  const stageRut = (folder: string, timed: number[], flags: { chapter: number; verse: number; kind: string }[], listen: { verse: string; edge: string }[]) => {
    for (const d of ['audio/msb-david', 'judged', 'listen']) mkdirSync(join(folder, d), { recursive: true });
    const chapters: Record<string, unknown> = {};
    const judged: Record<string, { verses: { n: number; flags?: { kind: string }[] }[] }> = {};
    for (const c of timed) {
      chapters[String(c)] = {};
      judged[String(c)] = { verses: [1, 2].map((n) => ({ n, flags: flags.filter((f) => f.chapter === c && f.verse === n).map((f) => ({ kind: f.kind })) })) };
    }
    writeFileSync(join(folder, 'audio/msb-david/rut.json'), JSON.stringify({ chapters }));
    writeFileSync(join(folder, 'judged/msb-david-rut.json'), JSON.stringify({ chapters: judged, summary: { verses: timed.length * 2 } }));
    writeFileSync(join(folder, 'listen/msb-david-rut.json'), JSON.stringify({ verses: listen }));
  };

  it('stages in the cache by default, outside the worktree, and a run with no --out leaves nothing under staged/ in the tree', () => {
    const cache = fakeCache();
    stageRut(join(cache, 'staged'), rutChapters, [], []);
    const before = spawnSync('git', ['status', '--short', '--', 'scripts/audio-timings/staged'], { cwd: root, encoding: 'utf8' }).stdout;
    const done = run(['rut', '--summary-only'], cache);
    expect(done.status).toBe(0);
    // the summary was read from <cache>/staged: the default folder is there, and so outside the repo
    expect(parse(done.output.split('\n')[0]).timed).toBe(rutChapters.length);
    expect(existsSync(join(cache, 'staged/summary/rut.txt'))).toBe(true);
    expect(relative(root, join(cache, 'staged')).startsWith('..')).toBe(true);
    const after = spawnSync('git', ['status', '--short', '--', 'scripts/audio-timings/staged'], { cwd: root, encoding: 'utf8' }).stdout;
    expect(after).toBe(before);
    expect(readFileSync(join(tools, 'run-book.sh'), 'utf8')).toMatch(/out="\$cache\/staged"/);
  });

  it('prints the fixed summary line for a run with no chapter left out', () => {
    const cache = fakeCache();
    const folder = join(cache, 'out');
    stageRut(folder, rutChapters, [{ chapter: 1, verse: 2, kind: 'tail-extra' }], [{ verse: '1:2', edge: 'tail' }]);
    const done = run(['rut', '--out', folder, '--summary-only'], cache);
    expect(done.status).toBe(0);
    expect(parse(done.output.split('\n')[0])).toEqual({
      book: 'rut', timed: rutChapters.length, of: rutChapters.length, leftOut: 'none', notJudged: 'none', verses: rutChapters.length * 2,
      flags: 1, outside: 0, onList: true, edges: 1, minutes: 0,
    });
  });

  it('prints the fixed summary line for a run with a chapter left out, naming it, and a flag outside the listen list', () => {
    const cache = fakeCache();
    const folder = join(cache, 'out');
    const last = rutChapters[rutChapters.length - 1];
    stageRut(folder, rutChapters.filter((c) => c !== last), [{ chapter: 1, verse: 1, kind: 'head-clipped' }], []);
    const done = run(['rut', '--out', folder, '--summary-only'], cache);
    expect(done.status).toBe(3);
    expect(parse(done.output.split('\n')[0])).toEqual({
      book: 'rut', timed: rutChapters.length - 1, of: rutChapters.length, leftOut: String(last), notJudged: 'none', verses: (rutChapters.length - 1) * 2,
      flags: 1, outside: 1, onList: false, edges: 0, minutes: 0,
    });
    expect(done.output).toMatch(/outside the list: 1:1 head/);
  });
});
