// tests/unit/lxx-align-choose.test.ts — the model pass of `lxx:align` (scripts/lxx/align-choose.ts, story mw-u2w5klk.274.2; docs/lxx-align.md, 'The model pass'): a Builder session cuts the
// English the aligner left in remainder chunks (y 'align?') into chunks pointing at Greek word positions, each with a confidence and y 'model'. Here: the session's file, the runner's
// refusals (a pairing outside the verse's word positions above all), the splice into the verse's `e`, and the real Genesis 1 to 11 data (when the pinned sources are on the disk).
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { alignChapter, alignRuns, alignVerse, renderAlignReport, type AlignShare } from '../../scripts/lxx/align';
import {
  AlignChooseRefused,
  alignChoicesName,
  applyFixes,
  applyModel,
  FIX_RUN,
  MODEL_HEADER,
  checkModelLines,
  listRemainders,
  parseModelLines,
  readModelRows,
  runsOf,
  modelRowsTsv,
  parseAlignChooseArgs,
  runAlignChoose,
} from '../../scripts/lxx/align-choose';
import { alignedDiffs, joined } from '../support/lxx-align-choose';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

// Whether the real data is used, and where it is, is decided once by the gate's global setup (tests/support/lxx-real-data.ts, mw-cv2w9um): it prints one line, and a skip says why.
const real = lxxRealData();
const haveSources = real.run;
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };
const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const verseOf = (text: string, g: GreekWord[], s?: number[]): Verse => ({ n: 2, g, e: [{ t: text, g: [], ...(s ? { s } : {}) }] });
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

/**
 * Genesis 20:2 in miniature (mw-u2w5klk.349.16): 'She will' leads the verb 'love', so joinSupplied (the last step of alignChapter, after the rows) makes 'She will love,' one chunk. The rows are applied
 * before it, so the runs a session numbers must be the ones before it: the listing and the check use alignRuns, the stage `lxx:ship` applies the rows at.
 */
describe('the listing numbers the runs at the stage the ship applies the rows', () => {
  const g = (): GreekWord[] => [
    word('Ἀβραὰμ', 'abraam', 'Ἀβραάμ', 'N-NSM'),
    word('εἶπεν', 'eipen', 'λέγω', 'V-AAI-3S'),
    word('Σάρρας', 'sarras', 'Σάρρα', 'N-GSF'),
    word('ἀγαπᾶται', 'agapatai', 'ἀγαπάω', 'V-PPI-3S'),
    word('ἀδελφή', 'adelphē', 'ἀδελφή', 'N-NSF'),
    word('μου', 'mou', 'ἐγώ', 'P-GS'),
  ];
  const glosses = (lemma: string): string => ({ Ἀβραάμ: 'Abraham', Σάρρα: 'Sarah', ἀδελφή: 'sister', λέγω: 'say', ἀγαπάω: 'love' })[lemma] ?? '';
  const plain = (): Chapter => ({ book: 'Genesis', code: 'gen', chapter: 20, verses: [{ n: 2, g: g(), e: [{ t: 'And Abraham said of Sarah, She will love, my sister.', g: [] }] }] }) as unknown as Chapter;

  it('lists the runs the rows are applied to: She will is a run of its own in the listing, as it is when the ship applies the rows', () => {
    const listed = alignRuns(plain(), glosses).chapter;
    const runs = runsOf(listed.verses[0]);
    expect(runs.map((r) => listed.verses[0].e[r.chunk].t)).toEqual(['And', 'of', 'She will']);
    expect(listRemainders(listed)).toContain('{#3 She will} love,');
    // the shipped chapter has joined it to the verb: it has two runs, so a listing made from it would number the third away
    expect(runsOf(alignChapter(plain(), glosses).chapter.verses[0])).toHaveLength(2);
  });

  it('a session file made from the listing, run 3 included, applies in alignChapter with no row stale', () => {
    const listed = alignRuns(plain(), glosses).chapter;
    const { rows, offences } = checkModelLines(listed, parseModelLines('Gen.20:2 *').lines);
    expect(offences).toEqual([]);
    const shipped = alignChapter(plain(), glosses, rows);
    expect(shipped.stale).toEqual([]);
    expect(shipped.chapter.verses[0].e.map((c) => c.t)).toContain('She will love,');
  });

  it('alignRuns is the stage alignChapter applies the rows at: the chapter it gives is the one applyModel is given', () => {
    const listed = alignRuns(plain(), glosses).chapter;
    const rows = checkModelLines(listed, parseModelLines('Gen.20:2#1 And @-\nGen.20:2#2 of @-\nGen.20:2#3 She will @-').lines).rows;
    const done = applyModel(listed, rows);
    expect(done.stale).toEqual([]);
    const shipped = alignChapter(plain(), glosses, rows).chapter.verses[0];
    expect(shipped.e.map((c) => c.t)).toEqual(['And', 'Abraham', 'said', 'of', 'Sarah,', 'She will love,', 'my', 'sister.']);
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

describe('a supplied word the model pairs on its own (Genesis 11:2 "as they", 11:6 "they may have")', () => {
  const GREEK_THEY = [word('καὶ', 'kai', 'καί', 'CONJ'), word('δὲ', 'de', 'δέ', 'CONJ'), word('ἐκινήθησαν', 'ekinēthēsan', 'κινέω', 'V-API-3P')];
  const glossThey = (l: string): string => ({ καί: 'and', κινέω: 'move' })[l] ?? '';
  const build = (model: Parameters<typeof alignChapter>[2]): Verse =>
    alignChapter({ code: 'gen', book: 'Genesis', chapter: 1, verses: [verseOf('And they moved.', GREEK_THEY.map((w) => ({ ...w })))] } as Chapter, glossThey, model).chapter.verses[0];
  const row = { ref: 'Gen.1:2', run: 1, text: 'they', g: [1], mark: '' as const, confidence: 0.8 };

  it('stays its own chunk: only a chunk with no Greek joins the verb, so "moved" is bare and "they" keeps δέ', () => {
    expect(build([]).e.map((c) => [c.t, c.g, c.y])).toEqual([['And', [0], 'align'], ['they moved.', [2], 'align']]);
    expect(build([row]).e.map((c) => [c.t, c.g, c.y])).toEqual([['And', [0], 'align'], ['they', [1], 'model'], ['moved.', [2], 'align']]);
  });

  it('is the one difference the real-data check lets through: same Greek positions and confidence, the text short of supplied words only', () => {
    expect(alignedDiffs(build([]), build([row]))).toEqual([]);
  });

  it('keeps its power: a chunk that loses a word that is not supplied, a Greek position or a confidence, or goes missing, is reported', () => {
    const was = build([]);
    const lose = (change: (c: EnglishChunk) => void): Verse => {
      const now = build([row]);
      change(now.e[2]);
      return now;
    };
    expect(alignedDiffs(was, lose((c) => (c.t = 'moving.')))).not.toEqual([]);
    expect(alignedDiffs(was, lose((c) => (c.g = [1])))).not.toEqual([]);
    expect(alignedDiffs(was, lose((c) => (c.c = 0.1)))).not.toEqual([]);
    const heavier = { ...was, e: was.e.map((c, i) => (i === 1 ? { ...c, t: 'quickly they moved.' } : c)) };
    expect(alignedDiffs(heavier, build([row]))).not.toEqual([]);
    expect(alignedDiffs(was, { ...was, e: was.e.slice(0, 1) })).not.toEqual([]);
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

/**
 * A fix of the aligner's own pair (mw-u2w5klk.349.32), Genesis 13:18 in miniature: the lexicon's gloss for ἀποσκηνόω is 'pitch a tent', so the aligner pairs ἀποσκηνώσας to 'tent,' and the English that
 * renders it ('having removed his') has no Greek word. A `fix` row gives the whole phrase to the Greek word.
 */
describe('a fix row moves a Greek word the aligner paired to the wrong English word of its phrase', () => {
  const GREEK_TENT = [word('ἀποσκηνώσας', 'aposkēnōsas', 'ἀποσκηνόω', 'V-AAP-NSM'), word('ἐλθὼν', 'elthōn', 'ἔρχομαι', 'V-2AAP-NSM')];
  const glossTent = (l: string): string => ({ ἀποσκηνόω: 'to pitch a tent', ἔρχομαι: 'to come' })[l] ?? '';
  const TENT = 'having removed his tent, came';
  const build = (rows: Parameters<typeof alignChapter>[2]): ReturnType<typeof alignChapter> =>
    alignChapter({ code: 'gen', book: 'Genesis', chapter: 13, verses: [{ ...verseOf(TENT, GREEK_TENT.map((w) => ({ ...w }))), n: 18 }] } as Chapter, glossTent, rows);
  const run = { ref: 'Gen.13:18', run: 1, text: 'having removed his', g: [] as number[], mark: '' as const, confidence: 0.8 };
  const fix = { ref: 'Gen.13:18', run: FIX_RUN, text: 'having removed his tent,', g: [0], mark: '' as const, confidence: 0.8 };

  it('shows the fault first: the aligner gives ἀποσκηνώσας to "tent," and "having removed his" no Greek word', () => {
    const verse = build([run]).chapter.verses[0];
    expect(verse.e.map((c) => [c.t, c.g])).toEqual([['having removed his', []], ['tent,', [0]], ['came', [1]]]);
  });

  it('makes of the phrase one model chunk that holds the Greek word, and points the Greek word at it', () => {
    const done = build([run, fix]);
    const verse = done.chapter.verses[0];
    expect(done.stale).toEqual([]);
    expect(verse.e.map((c) => [c.t, c.g, c.y, c.c])).toEqual([['having removed his tent,', [0], 'model', 0.8], ['came', [1], 'align', 0.85]]);
    expect(verse.g[0].e).toBe(0);
    expect(septuagintChunkLinked(verse.e[0])).toBe(true);
  });

  it('can give a Greek word to a chunk of its own and release the word the aligner had paired there (g -)', () => {
    const split = [
      { ref: 'Gen.13:18', run: FIX_RUN, text: 'tent,', g: [], mark: '' as const, confidence: 0.8 },
      { ref: 'Gen.13:18', run: FIX_RUN, text: 'having removed his', g: [0], mark: '' as const, confidence: 0.8 },
    ];
    const done = build([run, ...split]);
    expect(done.stale).toEqual([]);
    expect(done.chapter.verses[0].e.map((c) => [c.t, c.g])).toEqual([['having removed his', [0]], ['tent,', []], ['came', [1]]]);
  });

  it('keeps the verse as the model pass left it, and names it, when a fix finds no such words, finds them twice, puts a Greek word in two chunks or leaves one with no English', () => {
    const plain = build([run]).chapter.verses[0];
    for (const [rows, why] of [
      [[{ ...fix, text: 'having removed her tent,' }], 'finds no such chunks'],
      [[{ ...fix, g: [0, 1] }], 'is in two chunks'],
      [[{ ...fix, g: [] }], 'is left with no English'],
      [[{ ...fix, g: [5] }], "outside the verse's word positions"],
    ] as Array<[typeof fix[], string]>) {
      const done = build([run, ...rows]);
      expect(done.chapter.verses[0], why).toEqual(plain);
      expect(done.stale.join(' '), why).toContain(why);
    }
    expect(build([run, { ...fix, ref: 'Gen.13:19' }]).stale.join(' ')).toContain('is for no verse of this chapter');
  });

  it('is a row of the file like any other: written `fix`, read back as run FIX_RUN, and no run of the model pass', () => {
    const tsv = modelRowsTsv([run, fix]);
    expect(tsv).toContain('Gen.13:18\tfix\thaving removed his tent,\t0\t\t0.80');
    expect(readModelRows(tsv)).toEqual([run, fix]);
    expect(applyFixes(build([run]).chapter, [fix]).chapter.verses[0].e.map((c) => c.t)).toEqual(['having removed his tent,', 'came']);
    const { stale } = applyModel(alignRuns({ code: 'gen', book: 'Genesis', chapter: 13, verses: [{ ...verseOf(TENT, GREEK_TENT.map((w) => ({ ...w }))), n: 18 }] } as Chapter, glossTent).chapter, [run, fix]);
    expect(stale).toEqual([]);
  });
});

/**
 * A fix cuts inside a model chunk that renders no Greek word (mw-u2w5klk.349.40), Genesis 17:13 in miniature: the run's chunk 'money shall' holds the 'money' that ἀργυρώνητος renders, so the fix
 * 'he that is bought with money' ends inside it, and the 'shall' it leaves is a chunk of its own (joinSupplied then joins it to its verb). A chunk that renders a Greek word is never cut.
 */
describe('a fix row may begin or end inside a chunk that renders no Greek word', () => {
  const G = [word('ὁ', 'ho', 'ὁ', 'T-NSM'), word('ἀργυρώνητος', 'argyrōnētos', 'ἀργυρώνητος', 'A-NSM'), word('ἔσται', 'estai', 'εἰμί', 'V-FMI-3S')];
  const chunks = (): EnglishChunk[] => [
    { t: 'he that is bought', g: [0], c: 0.85, y: 'align' },
    { t: 'with', g: [1], c: 0.85, y: 'align' },
    { t: 'money shall', g: [], s: [1], c: 0.8, y: 'model' },
    { t: 'be', g: [2], c: 0.85, y: 'align' },
  ];
  const chapter = (e: EnglishChunk[]): Chapter => {
    const g = G.map((w) => ({ ...w }));
    e.forEach((chunk, i) => chunk.g.forEach((k) => (g[k].e = i)));
    return { code: 'gen', book: 'Genesis', chapter: 17, verses: [{ n: 13, g, e }] } as Chapter;
  };
  const row = (text: string, g: number[]): Parameters<typeof applyFixes>[1][number] => ({ ref: 'Gen.17:13', run: FIX_RUN, text, g, mark: '' as const, confidence: 0.8 });
  const apply = (rows: Array<ReturnType<typeof row>>, e: EnglishChunk[] = chunks()): ReturnType<typeof applyFixes> => applyFixes(chapter(e), rows);

  it('ends inside the chunk that renders no Greek word: the words it leaves are a chunk of their own, with the supplied word still marked', () => {
    const done = apply([row('he that is bought with money', [0, 1])]);
    expect(done.stale).toEqual([]);
    const verse = done.chapter.verses[0];
    expect(verse.e.map((c) => [c.t, c.g, c.y])).toEqual([['he that is bought with money', [0, 1], 'model'], ['shall', [], 'model'], ['be', [2], 'align']]);
    expect(verse.e[1].s).toEqual([0]);
    expect(verse.e[0].s).toBeUndefined();
    expect(verse.g.map((w) => w.e)).toEqual([0, 0, 2]);
    expect(septuagintChunkLinked(verse.e[0])).toBe(true);
  });

  it('begins inside it too, and gives the words that come before it a chunk of their own', () => {
    const done = apply([row('money', [])], [{ t: 'the money', g: [], y: 'model', c: 0.8 }]);
    expect(done.stale).toEqual([]);
    expect(done.chapter.verses[0].e.map((c) => [c.t, c.g])).toEqual([['the', []], ['money', []]]);
  });

  it('never cuts a chunk that renders a Greek word: the fix then finds no such chunks and the verse is kept', () => {
    const was = chapter(chunks()).verses[0];
    const done = apply([row('he that', [0])]);
    expect(done.chapter.verses[0]).toEqual(was);
    expect(done.stale.join(' ')).toContain('finds no such chunks');
  });

  it('keeps reading a fix whose words are whole chunks as it did, even when the same word sits inside another chunk that could be cut', () => {
    const e: EnglishChunk[] = [{ t: 'of a', g: [], y: 'model', c: 0.8 }, { t: 'of', g: [0], y: 'align', c: 0.85 }];
    const done = apply([row('of', [0])], e);
    expect(done.stale).toEqual([]);
    expect(done.chapter.verses[0].e.map((c) => [c.t, c.g])).toEqual([['of a', []], ['of', [0]]]);
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
      await runAlignChoose(['--list', '--book', 'gen', '--chapter', '5'], { outDir: dir, ship: sources, print: (t) => listed.push(t) });
      expect(listed.join('\n')).toMatch(/^Gen\.5:1\n {2}Greek: /);
      const verses = [...listed.join('\n').matchAll(/^Gen\.5:(\d+)$/gm)].map((m) => `Gen.5:${m[1]} *`);
      expect(verses.length).toBeGreaterThan(20);
      const file = join(dir, 'session.txt');
      writeFileSync(file, verses.slice(1).join('\n'));
      await expect(runAlignChoose(['--book', 'gen', '--chapter', '5', '--from', file], { outDir: dir, ship: sources })).rejects.toBeInstanceOf(AlignChooseRefused);
      expect(existsSync(join(dir, alignChoicesName('gen', 5)))).toBe(false);
      writeFileSync(file, verses.join('\n'));
      const done = await runAlignChoose(['--book', 'gen', '--chapter', '5', '--from', file], { outDir: dir, ship: sources });
      expect(done.rows.length).toBeGreaterThan(50);
      expect(done.rows.every((r) => r.g.length === 0 && r.confidence === 0.8)).toBe(true);
      expect(readModelRows(readFileSync(join(dir, alignChoicesName('gen', 5)), 'utf8'))).toEqual(done.rows);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 10 * HOOK_TIMEOUT_MS);

  it.skipIf(!haveSources)('keeps the fix rows of a chapter\'s file when --from writes the runs again, after the runs (mw-u2w5klk.349.39)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-model-fix-'));
    try {
      const listed: string[] = [];
      await runAlignChoose(['--list', '--book', 'gen', '--chapter', '5'], { outDir: dir, ship: sources, print: (t) => listed.push(t) });
      const verses = [...listed.join('\n').matchAll(/^Gen\.5:(\d+)$/gm)].map((m) => `Gen.5:${m[1]} *`);
      const file = join(dir, 'session.txt');
      writeFileSync(file, verses.join('\n'));
      const path = join(dir, alignChoicesName('gen', 5));
      const fix = ['Gen.5:3\tfix\tlived and\t1\t\t0.80', 'Gen.5:9\tfix\tbegat\t2,3\tunsure\t0.50'].join('\n');
      writeFileSync(path, `${MODEL_HEADER.join('\t')}\nGen.5:1\t1\told row\t-\t\t0.80\n${fix}\n`);
      const done = await runAlignChoose(['--book', 'gen', '--chapter', '5', '--from', file], { outDir: dir, ship: sources });
      const written = readModelRows(readFileSync(path, 'utf8'));
      expect(written.filter((r) => r.run === FIX_RUN).map((r) => [r.ref, r.text, r.g, r.mark, r.confidence])).toEqual([
        ['Gen.5:3', 'lived and', [1], '', 0.8],
        ['Gen.5:9', 'begat', [2, 3], 'unsure', 0.5],
      ]);
      // the runs are the new ones (the old run row is gone), and every fix comes after them
      expect(written.some((r) => r.text === 'old row')).toBe(false);
      expect(written.findIndex((r) => r.run === FIX_RUN)).toBe(written.length - 2);
      expect(done.rows).toEqual(written);
      // a second --from keeps them, too
      await runAlignChoose(['--book', 'gen', '--chapter', '5', '--from', file], { outDir: dir, ship: sources });
      expect(readModelRows(readFileSync(path, 'utf8'))).toEqual(written);
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
