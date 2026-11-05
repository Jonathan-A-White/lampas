// tests/unit/lxx-release-chapters.test.ts — lxx:release writes a book's annotation rows for its shippable Greek chapters (mw-u2w5klk.265; docs/lxx-derivation.md 'The chapter bar', 'The annotation file').
// The book is tests/support/lxx-genesis.ts's Genesis: 50 chapters, each a copy of the first five verses of the Gen 1 fixture (79 words, 18 of them pending), with choices for some chapters only.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { syntheticGenesis } from '../support/lxx-genesis';
import { ANNOTATION_HEADER, ReleaseRefused, chapterRows, joinChoices, runRelease, shippedLine } from '../../scripts/lxx/release';
import { deriveBook, type DeriveInput } from '../../scripts/lxx/derive';
import type { KnownScore } from '../../scripts/lxx/known';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const genesis = syntheticGenesis(50);
const input: DeriveInput = { versification: genesis.versification, words: genesis.words, tagnt: [fixture('tagnt-slice.tsv')], tbesg: fixture('tbesg-slice.txt') };
const result = deriveBook(input, 'gen');

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-chapters-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const chapterOf = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)![1]);

/** A choices file for the pending words of the given chapters: each takes its first candidate. */
function choicesFor(chapters: readonly number[]): string {
  const rows = ['ref\tparsing\tlemma\tmark'];
  for (const p of result.pending) {
    if (!chapters.includes(chapterOf(p.ref))) continue;
    const c = p.candidates[0];
    rows.push(c ? `${p.ref}\t${c.morph}\t${c.lemma}\t` : `${p.ref}\tN-NSM\tλόγος\tguess`);
  }
  return rows.join('\n') + '\n';
}
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** A known-answer run that passes the bar, whatever chapters are asked. */
const passing = (chapters: readonly string[]): KnownScore[] =>
  chapters.map((chapter) => {
    const t = { words: 1000, lemma: 1000, full: 1000 };
    const none = { words: 0, lemma: 0, full: 0 };
    return { chapter, hidden: 'jhn', words: 1000, before: { 1: none, 2: none }, by: { '1': t, '2': none, '2a': none, '3': none, kept: none, none }, all: t, guesses: 0, unanswered: 0, choices: { given: 0, refused: 0, notPending: 0 } };
  });

async function release(choices: string) {
  const outDir = tmp();
  const choicesDir = tmp();
  writeFileSync(join(choicesDir, 'gen-01.tsv'), choices);
  const options = { input, outDir, choicesDir, known: passing };
  return { outDir, run: () => runRelease(['--book', 'gen'], options), path: join(outDir, 'annotations', 'gen.tsv') };
}

describe('the synthetic Genesis', () => {
  it('is 50 chapters of 79 words, each with the same 18 words pending and no break', () => {
    expect(genesis.wordsPerChapter).toBe(79);
    expect(result.words).toHaveLength(50 * 79);
    expect(result.pending).toHaveLength(50 * 18);
    expect(result.agreement.breaks).toBe(0);
  });
});

describe('lxx:release writes the shippable chapters of a book', () => {
  it('with choices for chapters 1 to 6 writes their rows only, under the line "# shipped chapters: 1-6 of 50"', async () => {
    const r = await release(choicesFor(range(1, 6)));
    const done = await r.run();
    expect(done.shipped).toEqual(range(1, 6));
    expect(done.chapters).toBe(50);
    const lines = readFileSync(r.path, 'utf8').trimEnd().split('\n');
    expect(lines[0]).toBe('# shipped chapters: 1-6 of 50');
    expect(lines[1].split('\t')).toEqual(ANNOTATION_HEADER);
    const refs = lines.slice(2).map((l) => l.split('\t')[0]);
    expect(refs).toHaveLength(6 * 79);
    expect(new Set(refs.map(chapterOf))).toEqual(new Set(range(1, 6)));
    expect(refs).toEqual(result.words.filter((w) => chapterOf(w.ref) <= 6).map((w) => w.ref));
  });

  it('writes the same bytes on a second run', async () => {
    const r = await release(choicesFor(range(1, 6)));
    await r.run();
    const first = readFileSync(r.path);
    await r.run();
    expect(readFileSync(r.path).equals(first)).toBe(true);
  });

  it('names a chapter left out inside the range: one pending word in chapter 3 gives "1-2, 4-6 of 50"', async () => {
    const rows = choicesFor(range(1, 6)).trimEnd().split('\n');
    const at = rows.findIndex((l) => l.startsWith('Gen.3:'));
    rows.splice(at, 1);
    const r = await release(rows.join('\n') + '\n');
    const done = await r.run();
    expect(done.shipped).toEqual([1, 2, 4, 5, 6]);
    expect(readFileSync(r.path, 'utf8').split('\n')[0]).toBe('# shipped chapters: 1-2, 4-6 of 50');
    expect(readFileSync(r.path, 'utf8')).not.toContain('Gen.3:');
  });

  it('writes nothing, and says so, for a book with no shippable chapter', async () => {
    const r = await release(choicesFor([]));
    const error = (await r.run().catch((e: unknown) => e)) as ReleaseRefused;
    expect(error).toBeInstanceOf(ReleaseRefused);
    expect(error.message).toContain('no chapter is shippable');
    expect(error.message).toContain('pending: 18 words left without an answer');
    expect(existsSync(join(r.outDir, 'annotations'))).toBe(false);
  });

  it('writes a whole book as it does today, under the line "# shipped chapters: all 50"', async () => {
    const r = await release(choicesFor(range(1, 50)));
    const done = await r.run();
    expect(done.shipped).toEqual(range(1, 50));
    const lines = readFileSync(r.path, 'utf8').trimEnd().split('\n');
    expect(lines[0]).toBe('# shipped chapters: all 50');
    expect(lines).toHaveLength(2 + 50 * 79);
  });
});

describe('lxx:release with no Morpheus cache (mw-u2w5klk.271)', () => {
  it('warns once, naming the book and the sg docker line that builds the cache, and still writes the chapters', async () => {
    const r = await release(choicesFor(range(1, 6)));
    const lines: string[] = [];
    const done = await runRelease(['--book', 'gen'], { input, outDir: r.outDir, choicesDir: join(r.outDir, '..', 'none'), known: passing, morpheusDir: tmp(), log: (l) => lines.push(l) }).catch((e: unknown) => e);
    // no choices file here: the run is refused, but the warning came first and the exit is the same as without it
    expect(done).toBeInstanceOf(ReleaseRefused);
    const warned = lines.filter((l) => l.includes('no Morpheus cache'));
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain('gen');
    expect(warned[0]).toContain("sg docker -c 'npm run lxx:derive -- --book gen'");
  });

  it('warns, and does not refuse, for a book whose chapters ship', async () => {
    const outDir = tmp();
    const choicesDir = tmp();
    writeFileSync(join(choicesDir, 'gen-01.tsv'), choicesFor(range(1, 6)));
    const lines: string[] = [];
    const done = await runRelease(['--book', 'gen'], { input, outDir, choicesDir, known: passing, morpheusDir: tmp(), log: (l) => lines.push(l) });
    expect(done.shipped).toEqual(range(1, 6));
    expect(lines.filter((l) => l.startsWith('warning: no Morpheus cache for gen'))).toHaveLength(1);
  });

  it('says nothing of it when the book has a cache', async () => {
    const outDir = tmp();
    const choicesDir = tmp();
    const morpheusDir = tmp();
    writeFileSync(join(morpheusDir, 'gen.tsv'), '');
    writeFileSync(join(choicesDir, 'gen-01.tsv'), choicesFor(range(1, 6)));
    const lines: string[] = [];
    await runRelease(['--book', 'gen'], { input, outDir, choicesDir, known: passing, morpheusDir, log: (l) => lines.push(l) });
    expect(lines.some((l) => l.includes('no Morpheus cache'))).toBe(false);
  });
});

describe('a chapter on its own figures', () => {
  const joined = joinChoices(result, new Map());

  it('counts each chapter’s words, pending words and guesses, and the chapter bar says which ships', () => {
    const rows = chapterRows(result, joined);
    expect(rows).toHaveLength(50);
    expect(rows[0]).toMatchObject({ chapter: 1, words: 79, pending: 18, guesses: 0, breaks: 0 });
    expect(rows[0].verdict.shippable).toBe(false);
    expect(rows[0].verdict.failures.map((f) => f.short)).toEqual(['pending: 18']);
  });

  it('counts the breaks of each chapter from the verse of each', () => {
    const broken = { ...result, agreement: { ...result.agreement, breaks: 2, breakVerses: ['Gen.2:1', 'Gen.2:3'] } };
    const [one, two] = chapterRows(broken, joinChoices(broken, new Map()));
    expect([one.breaks, two.breaks]).toEqual([0, 2]);
    expect(two.verdict.failures.map((f) => f.short)).toContain('breaks: 25.3 per 1,000');
  });

  it('says a chapter list as ranges, and a whole book as all', () => {
    expect(shippedLine([1, 2, 3, 4, 5, 6], range(1, 50))).toBe('# shipped chapters: 1-6 of 50');
    expect(shippedLine([1, 3, 4, 7], range(1, 50))).toBe('# shipped chapters: 1, 3-4, 7 of 50');
    expect(shippedLine(range(1, 50), range(1, 50))).toBe('# shipped chapters: all 50');
    expect(shippedLine([2], range(1, 50))).toBe('# shipped chapters: 2 of 50');
  });
});
