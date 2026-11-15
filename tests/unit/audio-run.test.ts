// The whole-Bible run's parts (mw-ar5k42b.4, docs/audio-run.md): the shares of the 66 books for 5 boxes, the staged books (made by run-book.sh, NOT played by the app),
// and the one command's refusals. Reads committed files and runs the script only where it stops before any Python (no audio, no model).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

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
  });
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
});
