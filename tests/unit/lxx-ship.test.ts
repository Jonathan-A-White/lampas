// tests/unit/lxx-ship.test.ts — `npm run lxx:ship -- --out <dir>` (scripts/lxx/ship.ts, mw-u2w5klk.265; docs/lxx-derivation.md 'The commands'): derive, release and build into a directory, no tracked file changed.
// The book is tests/support/lxx-genesis.ts's Genesis (50 chapters, choices for the first six); the sources are the fixtures, never the network, never Docker.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { syntheticGenesis } from '../support/lxx-genesis';
import type { LxxInput, LxxIndex } from '../../scripts/data-build-lxx';
import { deriveBook, type DeriveInput } from '../../scripts/lxx/derive';
import type { KnownScore } from '../../scripts/lxx/known';
import { parseArgs, runShip, type ShipOptions } from '../../scripts/lxx/ship';
import { db } from '../../src/data/db';
import { forgetChapters, loadChapter } from '../../src/data/chapter';
import { septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const genesis = syntheticGenesis(50);
const derive: DeriveInput = { versification: genesis.versification, words: genesis.words, tagnt: [fixture('tagnt-slice.tsv')], tbesg: fixture('tbesg-slice.txt') };
const result = deriveBook(derive, 'gen');
const chapterOf = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)![1]);

const tmpDirs: string[] = [];
const tmp = (parent = tmpdir()): string => {
  const dir = mkdtempSync(join(parent, 'lampas-lxx-ship-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

/** A choices file for the pending words of chapters 1 to `upTo`: each takes its first candidate. */
const choicesTo = (upTo: number): string =>
  ['ref\tparsing\tlemma\tmark', ...result.pending.filter((p) => chapterOf(p.ref) <= upTo).map((p) => `${p.ref}\t${p.candidates[0].morph}\t${p.candidates[0].lemma}\t`)].join('\n') + '\n';

const passing = (chapters: readonly string[]): KnownScore[] =>
  chapters.map((chapter) => {
    const t = { words: 1000, lemma: 1000, full: 1000 };
    const none = { words: 0, lemma: 0, full: 0 };
    return { chapter, hidden: 'jhn', words: 1000, before: { 1: none, 2: none }, by: { '1': t, '2': none, '2a': none, '3': none, kept: none, none }, all: t, guesses: 0, unanswered: 0, choices: { given: 0, refused: 0, notPending: 0 } };
  });

/** What the build reads of the pinned sources, made of the fixtures: the annotations come from the run's own release. */
const load = async (annotationsDir: string): Promise<LxxInput> => {
  const annotations: Record<string, string> = {};
  if (existsSync(annotationsDir)) for (const f of readdirSync(annotationsDir).sort()) if (f.endsWith('.tsv')) annotations[f.slice(0, -4)] = readFileSync(join(annotationsDir, f), 'utf8');
  return {
    versification: genesis.versification,
    words: genesis.words,
    translit: genesis.translit,
    annotations,
    usfm: {},
    tvtms: fixture('tvtms-slice.txt'),
    tbesg: fixture('tbesg-gen-1.txt'),
    licence: readFileSync(join(FIXTURES, 'LICENSE-LXX-Swete-1930')),
    readme: readFileSync(join(FIXTURES, 'README-LXX-Swete-1930.md')),
  };
};

function options(choices: Record<string, string>, over: Partial<ShipOptions> = {}): ShipOptions & { lines: string[] } {
  const choicesDir = tmp();
  for (const [name, text] of Object.entries(choices)) writeFileSync(join(choicesDir, name), text);
  const lines: string[] = [];
  return { input: derive, load, choicesDir, morpheusDir: tmp(), known: passing, books: [['Gen', 'Genesis'], ['Exo', 'Exodus']], log: (l) => lines.push(l), lines, ...over };
}

describe('npm run lxx:ship -- --out <dir>', () => {
  it('needs --out, and takes --no-morpheus and --build', () => {
    expect(() => parseArgs([])).toThrow(/usage: npm run lxx:ship -- --out <dir>/);
    expect(() => parseArgs(['--out'])).toThrow(/usage/);
    expect(parseArgs(['--out', 'dist/data-lxx'])).toEqual({ out: 'dist/data-lxx', morpheus: true });
    expect(parseArgs(['--out', 'x', '--no-morpheus', '--build', '55'])).toEqual({ out: 'x', morpheus: false, build: 55 });
  });

  it('derives each book that has a choices file, releases its shippable chapters and builds the chapters, index, lexicon and notices into the directory', async () => {
    const out = tmp();
    const o = options({ 'gen-01.tsv': choicesTo(6), 'readme.txt': 'not a choices file' });
    const done = await runShip(['--out', out, '--no-morpheus'], o);
    expect(o.lines).toContain('gen: shipped 1-6 of 50');
    // Exodus has no choices file: it is not run, and not named
    expect(o.lines.some((l) => l.startsWith('exo:'))).toBe(false);
    expect(done.books).toEqual([{ code: 'gen', shipped: [1, 2, 3, 4, 5, 6], chapters: 50 }]);
    expect(readdirSync(out).sort()).toEqual(['LICENSE-swete.txt', 'README-swete.md', 'README.md', 'gen', 'index.json', 'lexicon-grc-lxx.json']);
    expect(readdirSync(join(out, 'gen')).sort()).toEqual(['1.json', '2.json', '3.json', '4.json', '5.json', '6.json']);
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as LxxIndex & { books: Array<{ shipped: number[]; chapters: number; lampasChapters: number[][] }> };
    expect(index.books).toHaveLength(1);
    expect(index.books[0].shipped).toEqual([1, 2, 3, 4, 5, 6]);
    expect(index.books[0].chapters).toBe(50);
    expect(index.books[0].lampasChapters.slice(6).every((c) => c.length === 0)).toBe(true);
    expect(readFileSync(join(out, 'README.md'), 'utf8')).toBe(readFileSync('public/data-lxx/README.md', 'utf8'));
  });

  it('writes nothing under data/, public/ or docs/: git status is as it was, but for the directory (inside the repo)', async () => {
    const status = (): string[] => execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).split('\n').filter(Boolean);
    const before = status();
    const parent = tmp('.');
    const out = join(parent, 'data-lxx');
    await runShip(['--out', out], options({ 'gen-01.tsv': choicesTo(6) }));
    expect(existsSync(join(out, 'index.json'))).toBe(true);
    const after = status().filter((l) => !l.includes(parent.replace(/^\.\//, '')));
    expect(after).toEqual(before.filter((l) => !l.includes(parent.replace(/^\.\//, ''))));
    // and none of the derive's own files (data/lxx/derived, pending) or the annotation files
    expect(after.some((l) => /data\/lxx\/(derived|pending|annotations)/.test(l))).toBe(false);
  });

  it('leaves no temporary annotation files behind', async () => {
    const scratch = tmp();
    const before = readdirSync(scratch);
    await runShip(['--out', tmp()], options({ 'gen-01.tsv': choicesTo(6) }, { scratch }));
    expect(readdirSync(scratch)).toEqual(before);
  });

  it('says "none" for a book with a choices file and no shippable chapter, and does not fail', async () => {
    const out = tmp();
    const o = options({ 'gen-01.tsv': 'ref\tparsing\tlemma\tmark\n' });
    const done = await runShip(['--out', out], o);
    expect(o.lines).toContain('gen: shipped none of 50');
    expect(done.books).toEqual([{ code: 'gen', shipped: [], chapters: 50 }]);
    expect((JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as LxxIndex).books).toEqual([]);
    expect(existsSync(join(out, 'gen'))).toBe(false);
  });

  it('with no choices file anywhere builds an empty index, and says so', async () => {
    const out = tmp();
    const o = options({});
    await runShip(['--out', out], o);
    expect(o.lines.join('\n')).toContain('no book has a choices file');
    expect((JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as LxxIndex).books).toEqual([]);
  });

  it('says "all" for a whole book', async () => {
    const o = options({ 'gen-01.tsv': choicesTo(50) });
    await runShip(['--out', tmp()], o);
    expect(o.lines).toContain('gen: shipped all 50');
  });

  it('fails on a derive error: a book of the list that Swete’s file lacks, with a choices file', async () => {
    const o = options({ 'exo-01.tsv': 'ref\tparsing\tlemma\tmark\n' });
    await expect(runShip(['--out', tmp()], o)).rejects.toThrow(/no book 'exo'/);
  });

  it('a book run twice writes the same bytes', async () => {
    const out = tmp();
    await runShip(['--out', out], options({ 'gen-01.tsv': choicesTo(6) }));
    const first = readFileSync(join(out, 'gen', '6.json'), 'utf8');
    const index = readFileSync(join(out, 'index.json'), 'utf8');
    await runShip(['--out', out], options({ 'gen-01.tsv': choicesTo(6) }));
    expect(readFileSync(join(out, 'gen', '6.json'), 'utf8')).toBe(first);
    expect(readFileSync(join(out, 'index.json'), 'utf8')).toBe(index);
  });
});

// mw-u2w5klk.270: Gen.12:12#8 (Αἰγύπτιοι) had the parsing A-NPM-LG, which the app cannot put in words, and the real run stopped there. The cause is fixed where the code is made (tagnt.ts normMorph);
// a word that still comes with such a parsing (a model's guess may write any) holds its chapter back, and the run goes on.
describe('a word whose parsing cannot be put in words', () => {
  /** choicesTo(6), with the first pending word of chapter 2 chosen as a guess with the parsing A-NPM-LG */
  const unsayable = (): { text: string; ref: string } => {
    const word = result.pending.find((p) => chapterOf(p.ref) === 2)!;
    const lines = choicesTo(6).split('\n').map((l) => (l.startsWith(`${word.ref}\t`) ? `${word.ref}\tA-NPM-LG\tΑἰγύπτιος\tguess` : l));
    return { text: lines.join('\n'), ref: word.ref };
  };

  it('holds its chapter back as not shippable, names why, and the run goes on and exits clean', async () => {
    const out = tmp();
    const { text, ref } = unsayable();
    const o = options({ 'gen-01.tsv': text });
    const done = await runShip(['--out', out, '--no-morpheus'], o);
    expect(done.books).toEqual([{ code: 'gen', shipped: [1, 3, 4, 5, 6], chapters: 50 }]);
    expect(o.lines.find((l) => l.startsWith('gen: shipped'))).toMatch(/^gen: shipped 1, 3-6 of 50/);
    expect(o.lines.join('\n')).toContain(`${ref} has the parsing "A-NPM-LG"`);
    expect(readdirSync(join(out, 'gen')).sort()).toEqual(['1.json', '3.json', '4.json', '5.json', '6.json']);
  });
});

describe('a chapter lxx:ship writes loads in the reader', () => {
  const written: { out: string } = { out: '' };
  beforeEach(async () => {
    written.out = tmp();
    await runShip(['--out', written.out, '--no-morpheus'], options({ 'gen-01.tsv': choicesTo(6) }));
    await db.open();
    await db.settings.clear();
    forgetChapters();
    await setSetting(septuagintSetting, 'on');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input).replace(/\?v=[0-9a-f]{12}$/, '');
      const file = join(written.out, url.replace(/^\/data-lxx\//, ''));
      return url.startsWith('/data-lxx/') && existsSync(file) ? new Response(readFileSync(file, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } }) : new Response('not found', { status: 404 });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens Genesis 3 from the Septuagint with each word’s parsing put in words', async () => {
    const chapter = await loadChapter('gen', 3);
    expect(chapter).toMatchObject({ code: 'gen', chapter: 3, lang: 'grc', translation: 'lxx2012', edition: 'swete' });
    const codes = new Set(chapter.verses.flatMap((v) => v.g.map((w) => w.p)));
    expect(codes.size).toBeGreaterThan(0);
    for (const code of codes) expect(chapter.parse[code]).toBeTruthy();
  });
});
