// tests/unit/lxx-unpaired.test.ts — `npm run lxx:unpaired` (scripts/lxx/unpaired.ts, story mw-u2w5klk.349.1; docs/lxx-align.md 'The unpaired English'): the English content words of Brenton's Septuagint
// that sit in a remainder chunk (y 'align?') or in a chunk with no Greek word, counted per chapter and book; English the model pass settled as rendering no Greek is counted apart. Here: the function-word
// filter, the counting on a fixture verse with a known remainder, the table, the arguments, and (where the git-ignored sources are on the disk, as in lxx-align-choose.test.ts) the real Genesis 1 to 11.
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
  type UnpairedRow,
} from '../../scripts/lxx/unpaired';
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

describe.skipIf(!real.run)('the real Genesis 1 to 11', () => {
  const dirs: string[] = [];
  let rows: UnpairedRow[] = [];
  beforeAll(async () => {
    const scratch = mkdtempSync(join(tmpdir(), 'lampas-lxx-unpaired-'));
    dirs.push(scratch);
    rows = await runUnpaired(['--book', 'gen'], { rawDir: real.rawDir, morpheusDir: real.morpheusDir, scratch, log: () => undefined });
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('reads 0 gaps in each of Genesis 1 to 11, with the English the model settled as rendering no Greek counted apart', () => {
    const first = rows.filter((r) => r.code === 'gen' && r.chapter >= 1 && r.chapter <= 11);
    expect(first.map((r) => r.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(first.map((r) => r.gaps)).toEqual(first.map(() => 0));
    // English content words the model pass settled as rendering no Greek word, by chapter (a 'there' or 'of' that a case ending carries; function words are not counted)
    expect(first.map((r) => r.model)).toEqual(MODEL_NO_GREEK_GEN_1_TO_11);
    for (const r of first) expect(r.content, `Gen ${r.chapter}`).toBeGreaterThan(0);
  });

  it('reports the gaps of a chapter no model session has reached (Genesis 12) without failing, and none in Genesis 20, whose 15 words the model settled as rendering no Greek', () => {
    const twelve = rows.find((r) => r.code === 'gen' && r.chapter === 12);
    expect(twelve?.gaps).toBeGreaterThan(0);
    expect(twelve?.model).toBe(0);
    const twenty = rows.find((r) => r.code === 'gen' && r.chapter === 20);
    expect([twenty?.gaps, twenty?.model]).toEqual([0, 15]);
  });
});

const MODEL_NO_GREEK_GEN_1_TO_11 = [11, 9, 13, 17, 33, 18, 23, 40, 12, 6, 31];
