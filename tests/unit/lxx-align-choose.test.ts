// tests/unit/lxx-align-choose.test.ts — the model pass of `lxx:align` (scripts/lxx/align-choose.ts, story mw-u2w5klk.274.2; docs/lxx-align.md, 'The model pass'): a Builder session cuts the
// English the aligner left in remainder chunks (y 'align?') into chunks pointing at Greek word positions, each with a confidence and y 'model'. Here: the session's file, the runner's
// refusals (a pairing outside the verse's word positions above all), the splice into the verse's `e`, and the real Genesis 1 to 11 data (when the pinned sources are on the disk).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';
import { alignChapter, alignVerse, renderAlignReport, type AlignShare } from '../../scripts/lxx/align';
import {
  ALIGN_CHOICES_DIR,
  AlignChooseRefused,
  alignChoicesName,
  applyModel,
  checkModelLines,
  listRemainders,
  parseModelLines,
  readModelRows,
  runsOf,
  modelRowsTsv,
  parseAlignChooseArgs,
  runAlignChoose,
} from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const haveSources = existsSync('data/raw/lxx') && existsSync('data/lxx/morpheus/gen.tsv');
const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const verseOf = (text: string, g: GreekWord[], s?: number[]): Verse => ({ n: 2, g, e: [{ t: text, g: [], ...(s ? { s } : {}) }] });
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

/** Genesis 1:2 in miniature: three Greek words, one of which the aligner pairs; the rest of the English is remainder. */
const chapterOf = (verse: Verse): Chapter => ({ book: 'Genesis', code: 'gen', chapter: 1, verses: [verse] }) as unknown as Chapter;
const gloss = (lemma: string): string => ({ γῆ: 'earth', ὕδωρ: 'water' })[lemma] ?? '';

const GREEK = [
  word('Ἡ', 'hē', 'ὁ', 'T-NSF'),
  word('γῆ', 'gē', 'γῆ', 'N-NSF'),
  word('ἦν', 'ēn', 'εἰμί', 'V-IAI-3S'),
  word('ἀόρατος', 'aoratos', 'ἀόρατος', 'A-NSF'),
  word('καὶ', 'kai', 'καί', 'CONJ'),
  word('ἀκατασκεύαστος', 'akataskeuastos', 'ἀκατασκεύαστος', 'A-NSF'),
];
const TEXT = 'But the earth was unsightly and unfurnished.';
const before = (): Chapter => alignChapter(chapterOf(verseOf(TEXT, GREEK.map((w) => ({ ...w })))), gloss).chapter;

describe('the aligner leaves runs for the model', () => {
  it('lists each remainder of a verse as a numbered run, with the Greek words that have no English yet', () => {
    const chapter = before();
    const verse = chapter.verses[0];
    const runs = runsOf(verse);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.map((r) => verse.e[r.chunk].y)).toEqual(runs.map(() => 'align?'));
    expect(runs.map((r) => r.run)).toEqual(runs.map((_, i) => i + 1));
    const text = listRemainders(chapter);
    expect(text).toContain('Gen.1:2');
    expect(text).toContain('#1');
  });
});

describe('the session file', () => {
  it('reads a run as text and Greek positions between slashes, a mark after the positions, and a run of one chunk with no text', () => {
    const { lines, offences } = parseModelLines(
      ['# a comment', 'Gen.1:2#1 But the @0 / was @2 ?', 'Gen.1:2#2 @1,3 guess', 'Gen.1:2#3 supplied words @-', 'Gen.1:3 *'].join('\n'),
    );
    expect(offences).toEqual([]);
    expect(lines).toEqual([
      { ref: 'Gen.1:2', run: 1, line: 2, chunks: [{ text: 'But the', g: [0], mark: '' }, { text: 'was', g: [2], mark: 'unsure' }] },
      { ref: 'Gen.1:2', run: 2, line: 3, chunks: [{ text: undefined, g: [1, 3], mark: 'guess' }] },
      { ref: 'Gen.1:2', run: 3, line: 4, chunks: [{ text: 'supplied words', g: [], mark: '' }] },
      { ref: 'Gen.1:3', run: 0, line: 5, chunks: [] },
    ]);
  });

  it('refuses a line with no reference, a chunk with no positions, an empty chunk among several', () => {
    const { offences } = parseModelLines(['the earth @1', 'Gen.1:2#1 the earth', 'Gen.1:2#2 @1 / @2'].join('\n'));
    expect(offences).toHaveLength(3);
    expect(offences[0]).toContain('line 1');
    expect(offences[1]).toContain('line 2');
    expect(offences[2]).toContain('line 3');
  });
});

describe('the runner checks the file against the verse', () => {
  const chapter = before();
  const verse = chapter.verses[0];
  const free = verse.g.map((w, i) => (w.e === undefined ? i : -1)).filter((i) => i >= 0);
  const runs = runsOf(verse);
  const wholeRun = (k: number, g: string): string => `Gen.1:2#${k} @${g}`;

  it('refuses a pairing outside the verse\'s word positions, naming the run', () => {
    const lines = runs.map((r) => wholeRun(r.run, r.run === 1 ? '99' : '-')).join('\n');
    const { offences, rows } = checkModelLines(chapter, parseModelLines(lines).lines);
    expect(rows).toEqual([]);
    expect(offences.join('\n')).toMatch(/Gen\.1:2#1.*99.*(outside|not a word)/);
  });

  it('refuses a Greek word the aligner already paired, one used twice, a text that is not the run, a run missing and a run not in the chapter', () => {
    const paired = verse.g.findIndex((w) => w.e !== undefined);
    expect(paired).toBeGreaterThanOrEqual(0);
    const bad = [wholeRun(1, String(paired)), `Gen.1:2#2 not the run @-`, 'Gen.1:9#1 @-', 'Gen.1:2#9 @-'].join('\n');
    const { offences } = checkModelLines(chapter, parseModelLines(bad).lines);
    const all = offences.join('\n');
    expect(all).toContain(`Gen.1:2#1: Greek word ${paired}`);
    expect(all).toContain('Gen.1:2#2: the chunks read');
    expect(all).toContain('Gen.1:9#1: not a verse of this chapter');
    expect(all).toContain('Gen.1:2#9: the verse has no such run');
    if (runs.length > 2) expect(all).toContain('no choice for run');
    const twice = checkModelLines(chapter, parseModelLines([wholeRun(1, `${free[0]}`), wholeRun(2, `${free[0]}`)].join('\n')).lines);
    if (runs.length > 1) expect(twice.offences.join('\n')).toContain(`Greek word ${free[0]} is in two chunks`);
  });

  it('writes a confidence a chunk: 0.8 chosen, 0.5 unsure, 0.4 guess', () => {
    const first = runs[0];
    const mark = (m: string): number => {
      const lines = runs.map((r) => (r.run === first.run ? `Gen.1:2#${r.run} @${free.length ? free[0] : '-'}${m}` : `Gen.1:2#${r.run} @-`)).join('\n');
      const out = checkModelLines(chapter, parseModelLines(lines).lines);
      expect(out.offences).toEqual([]);
      return out.rows.find((r) => r.run === first.run)!.confidence;
    };
    expect(mark('')).toBe(0.8);
    expect(mark(' ?')).toBe(0.5);
    expect(mark(' guess')).toBe(0.4);
  });

  it('`ref *` gives every run of the verse that has no line of its own no Greek', () => {
    const lines = parseModelLines(`Gen.1:2 *\nGen.1:2#${runs[0].run} @${free.length ? free[0] : '-'}`).lines;
    const { rows, offences } = checkModelLines(chapter, lines);
    expect(offences).toEqual([]);
    expect(rows).toHaveLength(runs.length);
    expect(rows.slice(1).every((r) => r.g.length === 0)).toBe(true);
    expect(checkModelLines(chapter, parseModelLines('Gen.1:7 *').lines).offences.join('\n')).toContain('Gen.1:7 *: not a verse of this chapter');
  });

  it('the rows survive a round trip through the choices file', () => {
    const lines = runs.map((r) => `Gen.1:2#${r.run} @-`).join('\n');
    const { rows } = checkModelLines(chapter, parseModelLines(lines).lines);
    expect(readModelRows(modelRowsTsv(rows))).toEqual(rows);
    expect(alignChoicesName('gen', 1)).toBe('gen-01.tsv');
  });
});

describe('the model\'s chunks are spliced into the verse', () => {
  const chapter = before();
  const verse = chapter.verses[0];
  const free = verse.g.map((w, i) => (w.e === undefined ? i : -1)).filter((i) => i >= 0);

  it('re-chooses every run as chunks with Greek positions, a confidence c and y "model", points each word at its chunk, and drops no English', () => {
    const runs = runsOf(verse);
    // every run is one chunk; the first goes to the first free Greek word, the rest to none
    const lines = runs.map((r) => `Gen.1:2#${r.run} @${r.run === 1 && free.length > 0 ? free[0] : '-'}`).join('\n');
    const { rows, offences } = checkModelLines(chapter, parseModelLines(lines).lines);
    expect(offences).toEqual([]);
    const done = applyModel(chapter, rows);
    expect(done.stale).toEqual([]);
    const v = done.chapter.verses[0];
    expect(joined(v)).toBe(TEXT);
    expect(v.e.some((c) => c.y === 'align?')).toBe(false);
    for (const chunk of v.e) if (chunk.y === 'model') expect(chunk.c).toBe(0.8);
    expect(v.e.filter((c) => c.y === 'model')).toHaveLength(runs.length);
    v.e.forEach((chunk, i) => chunk.g.forEach((g) => expect(v.g[g].e).toBe(i)));
    if (free.length > 0) expect(v.g[free[0]].e).toBeDefined();
    // aligned chunks are as the aligner left them
    for (const chunk of v.e.filter((c) => c.y === 'align')) expect(verse.e.find((c) => c.t === chunk.t && c.c === chunk.c)).toBeDefined();
  });

  it('cuts a run in several chunks, carries the supplied words to the chunk they fall in, and a word of two chunks is refused', () => {
    const g = [word('γῆ', 'gē', 'γῆ', 'N-NSF'), word('ἦν', 'ēn', 'εἰμί', 'V-IAI-3S'), word('ἀόρατος', 'aoratos', 'ἀόρατος', 'A-NSF')];
    const ch = alignChapter(chapterOf(verseOf('The earth was invisible and bare.', g, [2])), () => 'earth').chapter;
    const lines = parseModelLines(runsOf(ch.verses[0]).map((r) => `Gen.1:2#${r.run} @-`).join('\n')).lines;
    expect(checkModelLines(ch, lines).offences).toEqual([]);
    const custom = parseModelLines('Gen.1:2#1 was @1 / invisible and bare. @2').lines;
    const out = checkModelLines(ch, custom);
    // the run the aligner left is whatever it is; the only claim here is that a multi-chunk line is read in order, and that a text which is not the run is refused
    expect(out.offences.join('\n')).toMatch(/the chunks read/);
  });

  it('a stale run (the aligner has moved on) is kept as the aligner left it and named, not dropped and not thrown', () => {
    const runs = runsOf(verse);
    const rows = [{ ref: 'Gen.1:2', run: runs[0].run, text: 'something else', g: [] as number[], mark: '' as const, confidence: 0.8 }];
    const done = applyModel(chapter, rows);
    expect(done.stale.join('\n')).toContain(`Gen.1:2#${runs[0].run}`);
    expect(joined(done.chapter.verses[0])).toBe(TEXT);
    expect(done.chapter.verses[0].e.filter((c) => c.y === 'align?')).toHaveLength(runs.length);
  });
});

describe('the report names the share the model pass settled', () => {
  const shares: AlignShare[] = [{ code: 'gen', book: 'Genesis', chapter: 1, verses: 31, words: 751, paired: 700, sure: 600, tokens: 800, pairedTokens: 700, model: 70 }];
  it('has a column for the Greek words the model paired, and a line with the total', () => {
    const text = renderAlignReport(shares);
    expect(text).toContain('| Genesis 1 | 31 | 751 | 700 | 93.2% | 79.9% | 70 (9.3%) |');
    expect(text).toContain('70 of them by the model pass');
  });
});

// the real Genesis 1 to 11: when the pinned sources and the Morpheus cache are on the disk (a Builder links data/raw and data/lxx/morpheus; the Laptop has them)
describe.skipIf(!haveSources)('Genesis 1 to 11 with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (let n = 1; n <= 11; n++) out.set(n, JSON.parse(readFileSync(join(dir, 'gen', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-model-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-model-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { alignDir: '', log: () => undefined });
    await runShip(['--out', b], { log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has a model file for each of the eleven chapters, and none of its runs is stale', () => {
    const files = readdirSync(ALIGN_CHOICES_DIR).filter((f) => f.startsWith('gen-'));
    expect(files).toEqual(Array.from({ length: 11 }, (_, i) => alignChoicesName('gen', i + 1)));
    expect(stale).toEqual([]);
  });

  it('re-chooses every remainder: no chunk is left y "align?", every model chunk has c and its Greek positions are real, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
        const used = verse.e.flatMap((c) => c.g);
        expect(new Set(used).size).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Gen ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.e.forEach((chunk, i) => chunk.g.forEach((g) => expect(verse.g[g].e).toBe(i)));
      }
    }
  });

  it('drops no word and no English: the chunks joined are Brenton\'s whole verse as the aligner had it, the Greek words are the same, and an aligned chunk is untouched', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        const prior = was.verses[i];
        expect(joined(verse), `Gen ${n}:${verse.n}`).toBe(joined(prior));
        expect(verse.g.map((w) => w.t)).toEqual(prior.g.map((w) => w.t));
        const supplied = (v: Verse): number => v.e.reduce((a, c) => a + (c.s?.length ?? 0), 0);
        expect(supplied(verse)).toBe(supplied(prior));
        const keep = (v: Verse): string[] => v.e.filter((c) => c.y === 'align').map((c) => `${c.t}|${c.g.join(',')}|${c.c}`);
        expect(keep(verse)).toEqual(keep(prior));
      });
    }
  });

  it('settles more of the Greek: more words have English than the aligner alone gave, in every chapter', () => {
    const paired = (c: Chapter): number => c.verses.reduce((a, v) => a + v.g.filter((w) => w.e !== undefined).length, 0);
    for (const [n, chapter] of withModel) expect(paired(chapter), `Gen ${n}`).toBeGreaterThan(paired(base.get(n)!));
  });

  it('Genesis 1 reads woven through weaveVerse with the model\'s chunks', () => {
    const gen1 = withModel.get(1)!;
    const known = new Set(gen1.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
    let modelWoven = 0;
    for (const verse of gen1.verses) {
      const woven = weaveVerse(verse, { solid: known });
      expect(woven).toHaveLength(verse.e.length);
      verse.e.forEach((chunk, i) => {
        if (chunk.y === 'model' && woven[i]) {
          modelWoven++;
          expect(woven[i]!.words.map((w) => w.t)).toEqual(chunk.g.map((g) => verse.g[g].t));
        }
      });
    }
    expect(modelWoven).toBeGreaterThan(40);
  });
});

describe('the command', () => {
  it('reads its flags: a listing or a file, for one chapter of a book', () => {
    expect(parseAlignChooseArgs(['--list', '--book', 'Gen', '--chapter', '2'])).toMatchObject({ book: 'gen', chapter: 2, list: true });
    expect(parseAlignChooseArgs(['--book', 'gen', '--chapter', '2', '--from', 'x.txt'])).toMatchObject({ list: false, from: 'x.txt' });
    expect(() => parseAlignChooseArgs(['--book', 'gen', '--chapter', '2'])).toThrow(/usage/);
    expect(() => parseAlignChooseArgs(['--list', '--book', 'gen', '--from', 'x'])).toThrow(/usage/);
    expect(() => parseAlignChooseArgs(['--list', '--book', 'genesis', '--chapter', '1'])).toThrow(/usage/);
  });

  it.skipIf(!haveSources)('lists the runs of a shipped chapter, refuses a file that misses a run and writes nothing, and writes the file of one that holds up', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-model-cmd-'));
    try {
      const listed: string[] = [];
      await runAlignChoose(['--list', '--book', 'gen', '--chapter', '5'], { outDir: dir, print: (t) => listed.push(t) });
      expect(listed.join('\n')).toMatch(/^Gen\.5:1\n {2}Greek: /);
      const verses = [...listed.join('\n').matchAll(/^Gen\.5:(\d+)$/gm)].map((m) => `Gen.5:${m[1]} *`);
      expect(verses.length).toBeGreaterThan(20);
      const file = join(dir, 'session.txt');
      writeFileSync(file, verses.slice(1).join('\n'));
      await expect(runAlignChoose(['--book', 'gen', '--chapter', '5', '--from', file], { outDir: dir })).rejects.toBeInstanceOf(AlignChooseRefused);
      expect(existsSync(join(dir, alignChoicesName('gen', 5)))).toBe(false);
      writeFileSync(file, verses.join('\n'));
      const done = await runAlignChoose(['--book', 'gen', '--chapter', '5', '--from', file], { outDir: dir });
      expect(done.rows.length).toBeGreaterThan(50);
      expect(done.rows.every((r) => r.g.length === 0 && r.confidence === 0.8)).toBe(true);
      expect(readModelRows(readFileSync(join(dir, alignChoicesName('gen', 5)), 'utf8'))).toEqual(done.rows);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 10 * HOOK_TIMEOUT_MS);
});

describe('alignVerse without a model is as it was', () => {
  it('leaves y "align?" for the model pass', () => {
    const out = alignVerse(verseOf('Hail, and farewell.', [word('ἀμήν', 'amēn', 'ἀμήν', 'PRT')]), () => '').verse;
    expect(out.e[0].y).toBe('align?');
  });
});
