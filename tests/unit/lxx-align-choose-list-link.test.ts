// tests/unit/lxx-align-choose-list-link.test.ts — `npm run lxx:align-choose -- --list` in a fresh worktree with no Morpheus cache stops at once and says to run `npm run lxx:link`
// (story mw-u2w5klk.349.25). It used to start downloading data/raw and then call Genesis 15, 19, 21 and 23 'not a shipped chapter'. The ship is faked here, so nothing is downloaded and the
// real sources are not needed; the refusal must come before the ship is asked.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';

const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const chapter = (): Chapter =>
  ({
    book: 'Genesis',
    code: 'gen',
    chapter: 15,
    verses: [{ n: 1, g: [word('Σάρρας', 'sarras', 'Σάρρα', 'N-GSF')], e: [{ t: 'of Sarah', g: [], y: 'align?' }] }],
  }) as unknown as Chapter;

const asked: string[][] = [];
vi.mock('../../scripts/lxx/ship', () => ({
  runShip: async (argv: readonly string[]) => {
    asked.push([...argv]);
    const dir = argv[argv.indexOf('--out') + 1];
    mkdirSync(join(dir, 'gen'), { recursive: true });
    writeFileSync(join(dir, 'gen', '15.json'), JSON.stringify(chapter()));
  },
}));

let work = '';
beforeEach(() => {
  asked.length = 0;
  work = mkdtempSync(join(tmpdir(), 'lampas-lxx-list-link-'));
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

describe('lxx:align-choose --list without the Morpheus link', () => {
  it('stops at once and names npm run lxx:link, asking the ship for nothing', async () => {
    const { runAlignChoose } = await import('../../scripts/lxx/align-choose');
    const morpheusDir = join(work, 'morpheus');
    const listed: string[] = [];
    await expect(runAlignChoose(['--list', '--book', 'gen', '--chapter', '15'], { outDir: work, ship: { morpheusDir, rawDir: join(work, 'raw') }, print: (t) => listed.push(t) })).rejects.toThrow(/npm run lxx:link/);
    expect(asked).toEqual([]);
    expect(listed).toEqual([]);
    expect(existsSync(join(work, 'raw'))).toBe(false);
  });

  it('names the book and the cache it looked for, and the way past it, --no-morpheus', async () => {
    const { runAlignChoose } = await import('../../scripts/lxx/align-choose');
    const morpheusDir = join(work, 'morpheus');
    await expect(runAlignChoose(['--list', '--book', 'gen', '--chapter', '15'], { outDir: work, ship: { morpheusDir } })).rejects.toThrow(new RegExp(`gen.*${join(morpheusDir, 'gen.tsv').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*--no-morpheus`, 's'));
  });

  it('the command line exits 1 with the same words and downloads nothing', () => {
    // a bare directory is the cwd: no data/raw, no data/lxx/morpheus, as in a fresh worktree on a host with no checkout to link from
    const tsx = resolve('node_modules/.bin/tsx');
    const script = resolve('scripts/lxx/align-choose.ts');
    let status = 0;
    let stderr = '';
    try {
      execFileSync(tsx, [script, '--list', '--book', 'gen', '--chapter', '15'], { cwd: work, stdio: 'pipe', encoding: 'utf8', timeout: 60_000 });
    } catch (error) {
      const e = error as { status: number; stderr: string };
      status = e.status;
      stderr = e.stderr;
    }
    expect(status).toBe(1);
    expect(stderr).toMatch(/npm run lxx:link/);
    expect(existsSync(join(work, 'data'))).toBe(false);
  }, 90_000);

  it('lists as before with the cache in place, and with --no-morpheus without it', async () => {
    const { runAlignChoose } = await import('../../scripts/lxx/align-choose');
    const morpheusDir = join(work, 'morpheus');
    mkdirSync(morpheusDir, { recursive: true });
    writeFileSync(join(morpheusDir, 'gen.tsv'), 'form\tanalyses\n');
    const listed: string[] = [];
    await runAlignChoose(['--list', '--book', 'gen', '--chapter', '15'], { outDir: work, ship: { morpheusDir }, print: (t) => listed.push(t) });
    expect(listed.join('\n')).toMatch(/^Gen\.15:1\n {2}Greek: 0:Σάρρας\*/);
    expect(asked).toHaveLength(1);

    const bare: string[] = [];
    await runAlignChoose(['--list', '--book', 'gen', '--chapter', '15', '--no-morpheus'], { outDir: work, ship: { morpheusDir: join(work, 'none') }, print: (t) => bare.push(t) });
    expect(bare.join('\n')).toBe(listed.join('\n'));
    expect(asked[1]).toContain('--no-morpheus');
  });
});
