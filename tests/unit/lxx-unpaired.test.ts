// tests/unit/lxx-unpaired.test.ts — `npm run lxx:unpaired` (scripts/lxx/unpaired.ts, story mw-u2w5klk.349.1; docs/lxx-align.md 'The unpaired English'): the English content words of Brenton's Septuagint
// that sit in a remainder chunk (y 'align?') or in a chunk with no Greek word, counted per chapter and book; English the model pass settled as rendering no Greek is counted apart. Here: the function-word
// filter, the counting on a fixture verse with a known remainder, the table, the arguments, and (where the git-ignored sources are on the disk, as in lxx-align-choose.test.ts) the real chapters against the counts of their sidecars (data/lxx/align/<book>.expect.json).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import {
  FUNCTION_WORDS,
  contentWordsOf,
  countChapter,
  countVerse,
  parseUnpairedArgs,
  renderUnpaired,
  runUnpaired,
  type UnpairedCount,
  type UnpairedRow,
} from '../../scripts/lxx/unpaired';
import { checkCounts, expectBooks, readExpect } from '../../scripts/lxx/align-expect';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const word = (t: string): GreekWord => ({ t, tr: t, s: '', l: t, p: 'N-NSM', y: '2', c: 0.9 });

/** One verse with every kind of chunk: paired, remainder, no Greek by the model, a chunk with no kind and no Greek, a pair of function words only. */
const chunks: EnglishChunk[] = [
  { t: 'And', g: [0], c: 0.7, y: 'align' }, // function word, paired
  { t: 'God', g: [1], c: 0.9, y: 'align' }, // content, paired
  { t: 'removed thence', g: [], y: 'align?' }, // content x2, a gap
  { t: 'and the', g: [], y: 'align?' }, // function words only: nothing to count
  { t: 'into the land', g: [], c: 0.8, y: 'model' }, // 'land' is content, settled by the model as rendering no Greek
  { t: 'of Gerar,', g: [2], c: 0.8, y: 'model' }, // content, paired by the model
  { t: 'dwelt', g: [] }, // content, a chunk with no Greek and no kind: a tap opens the Verse view
];
const verse: Verse = { n: 1, g: [word('Καὶ'), word('θεός'), word('Γέραρα')], e: chunks };
const chapter = { book: 'Genesis', code: 'gen', chapter: 20, verses: [verse, { ...verse, n: 2 }] } as unknown as Chapter;

describe('the function words', () => {
  it('leave out the little words, keep the content words, and ignore punctuation and the possessive s', () => {
    expect(contentWordsOf('And the LORD God said, “Let there be light” — and in his hand, a stone.')).toEqual(['lord', 'god', 'said', 'light', 'hand', 'stone']);
    expect(contentWordsOf("Abraham's wife; it was for him")).toEqual(['abraham', 'wife']);
    expect(contentWordsOf('removed thence')).toEqual(['removed', 'thence']);
    expect(contentWordsOf('— 3 …')).toEqual([]);
  });

  it('are one list: the words the story names are in it, and none is a content word of the fixture', () => {
    for (const w of ['and', 'the', 'of', 'to', 'a', 'that', 'in', 'is', 'was', 'for', 'he', 'his']) expect(FUNCTION_WORDS.has(w), w).toBe(true);
    for (const w of ['removed', 'thence', 'land', 'god', 'dwelt']) expect(FUNCTION_WORDS.has(w), w).toBe(false);
    for (const w of FUNCTION_WORDS) expect(w, 'lower case letters only').toMatch(/^[a-z]+$/);
  });
});

describe('counting a verse', () => {
  it('counts a remainder chunk and a chunk with no Greek word as gaps, a model chunk with no Greek apart, and a paired chunk as neither', () => {
    expect(countVerse(verse)).toEqual({ content: 6, gaps: 3, model: 1 });
  });

  it('counts a gap exactly where a tap on the chunk opens no word (septuagintChunkLinked is false), except a model chunk settled as no Greek', () => {
    const unlinked = chunks.filter((c) => !septuagintChunkLinked(c));
    expect(unlinked.map((c) => c.t)).toEqual(['removed thence', 'and the', 'into the land', 'dwelt']);
    const gapsOnly = unlinked.filter((c) => c.y !== 'model').flatMap((c) => contentWordsOf(c.t));
    expect(gapsOnly.length).toBe(countVerse(verse).gaps);
  });

  it('adds the verses of a chapter', () => {
    expect(countChapter(chapter)).toEqual({ content: 12, gaps: 6, model: 2 });
  });

  it('counts a verse whose English is the one chunk data:build:lxx makes (no y, every Greek word) as all gaps: a tap on it names no word, as septuagintChunkLinked says', () => {
    const whole: Verse = { n: 1, g: [word('Καὶ')], e: [{ t: 'And God said', g: [0] }] };
    expect(countVerse(whole)).toEqual({ content: 2, gaps: 2, model: 0 });
  });
});

describe('the table', () => {
  const rows: UnpairedRow[] = [
    { code: 'gen', book: 'Genesis', chapter: 1, content: 100, gaps: 0, model: 4 },
    { code: 'gen', book: 'Genesis', chapter: 2, content: 50, gaps: 5, model: 0 },
    { code: 'exo', book: 'Exodus', chapter: 1, content: 0, gaps: 0, model: 0 },
  ];
  it('has a row for each chapter in the order of the books, the book total last for each book, and the share of gaps in content words', () => {
    const text = renderUnpaired(rows).split('\n');
    expect(text[0]).toMatch(/Book\s+Chapter\s+English content words\s+Unpaired\s+No Greek by the model\s+Share/);
    const cells = (l: string): string[] => l.trim().split(/\s{2,}/);
    expect(cells(text[2])).toEqual(['Genesis', '1', '100', '0', '4', '0.0%']);
    expect(cells(text[3])).toEqual(['Genesis', '2', '50', '5', '0', '10.0%']);
    expect(cells(text[4])).toEqual(['Genesis', 'total', '150', '5', '4', '3.3%']);
    expect(cells(text[5])).toEqual(['Exodus', '1', '0', '0', '0', '—']);
    expect(cells(text[6])).toEqual(['Exodus', 'total', '0', '0', '0', '—']);
    expect(text.slice(-1)[0]).toMatch(/^3 chapters in 2 books: 150 English content words, 5 unpaired \(3\.3%\), 4 settled by the model as rendering no Greek\.$/);
  });
});

describe('the arguments', () => {
  it('take no flag but --book, --no-morpheus and --out, and refuse the rest', () => {
    expect(parseUnpairedArgs([])).toEqual({ morpheus: true });
    expect(parseUnpairedArgs(['--book', 'Gen', '--no-morpheus'])).toEqual({ book: 'gen', morpheus: false });
    expect(() => parseUnpairedArgs(['--book'])).toThrow(/usage/);
    expect(() => parseUnpairedArgs(['--chapter', '1'])).toThrow(/usage/);
  });
});

// The counts of every chapter that has a model file are in data/lxx/align/<book>.expect.json (npm run lxx:align-expect, docs/lxx-align.md 'A pairing pass'), written from this very command's table: a pass adds no number
// here. A stale sidecar fails in one line that names the command.
describe.skipIf(!real.run)('the real chapters, against the counts of their sidecars', () => {
  const dirs: string[] = [];
  const rows = new Map<string, UnpairedRow[]>();
  beforeAll(async () => {
    const scratch = mkdtempSync(join(tmpdir(), 'lampas-lxx-unpaired-'));
    dirs.push(scratch);
    for (const code of expectBooks()) rows.set(code, await runUnpaired(['--book', code], { rawDir: real.rawDir, morpheusDir: real.morpheusDir, scratch, log: () => undefined }));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  const measuredOf = (code: string): Map<number, UnpairedCount> => new Map((rows.get(code) ?? []).map((r) => [r.chapter, r]));

  it('has a sidecar for a book at least, and reads each chapter it names as it says: the gaps (0 in a chapter the model pass has been through) and the English settled as rendering no Greek', () => {
    expect(expectBooks().length).toBeGreaterThan(0);
    const problems = expectBooks().flatMap((code) => checkCounts(code, readExpect(code)!, measuredOf(code)));
    expect(problems).toEqual([]);
  });

  it('counts English content words in each chapter its sidecar names', () => {
    for (const code of expectBooks()) {
      for (const n of Object.keys(readExpect(code)!.chapters)) expect(measuredOf(code).get(Number(n))?.content, `${code} ${n}`).toBeGreaterThan(0);
    }
  });

  it('reports the gaps of the chapters no model session has reached without failing, and settles none of them as rendering no Greek', () => {
    for (const code of expectBooks()) {
      const reached = Object.keys(readExpect(code)!.chapters).map(Number);
      const unreached = (rows.get(code) ?? []).filter((r) => !reached.includes(r.chapter));
      for (const r of unreached) expect(r.model, `${code} ${r.chapter}: no model file, so nothing is settled by the model`).toBe(0);
      if (unreached.length > 0) expect(unreached.reduce((a, r) => a + r.gaps, 0), `${code}: the chapters not yet reached have gaps`).toBeGreaterThan(0);
    }
  });
});
