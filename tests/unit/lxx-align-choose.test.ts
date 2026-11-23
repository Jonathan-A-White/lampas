// tests/unit/lxx-align-choose.test.ts — the model pass of `lxx:align` (scripts/lxx/align-choose.ts, story mw-u2w5klk.274.2; docs/lxx-align.md, 'The model pass'): a Builder session cuts the
// English the aligner left in remainder chunks (y 'align?') into chunks pointing at Greek word positions, each with a confidence and y 'model'. Here: the session's file, the runner's
// refusals (a pairing outside the verse's word positions above all), the splice into the verse's `e`, and the real Genesis 1 to 11 data (when the pinned sources are on the disk).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { alignChapter, alignReportFile, alignRuns, alignVerse, lettersOf, renderAlignReport, renderBookReport, SUPPLIED_FOR_VERB, type AlignShare } from '../../scripts/lxx/align';
import { recordedWithout, withoutList } from '../../scripts/lxx/morpheus';
import { alignFileChapters, checkFiles, checkLeftovers, expectBooks, expectCommand, measureShipped, readExpect } from '../../scripts/lxx/align-expect';
import {
  ALIGN_CHOICES_DIR,
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
import { runShip, type Shipped } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

// Whether the real data is used, and where it is, is decided once by the gate's global setup (tests/support/lxx-real-data.ts, mw-cv2w9um): it prints one line, and a skip says why.
const real = lxxRealData();
const haveSources = real.run;
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };
const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const verseOf = (text: string, g: GreekWord[], s?: number[]): Verse => ({ n: 2, g, e: [{ t: text, g: [], ...(s ? { s } : {}) }] });
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');
const aligned = (v: Verse): EnglishChunk[] => v.e.filter((c) => c.y === 'align');
/**
 * How the aligner's own chunks of `now` (the model pass applied) differ from those of `was` (without it), by Greek positions: none, in a verse the model pass left alone. A chunk keeps its
 * positions and confidence; its text may be short of the words Brenton supplies for a verb that the model paired with a Greek word of their own (joinSupplied joins only a chunk with no Greek:
 * "they moved" is "moved" when the model gives "they" a word), and of nothing else.
 */
const alignedDiffs = (was: Verse, now: Verse): string[] => {
  const out: string[] = [];
  const key = (c: EnglishChunk): string => c.g.join(',');
  // a lead chunk (mw-u2w5klk.274.14) is supplied words paired to the verb's Greek word without joining it, so another chunk holds the same word: it is left out on both sides
  const isLead = (v: Verse, d: EnglishChunk): boolean =>
    d.c === 0.5 && d.t.split(/\s+/).every((w) => SUPPLIED_FOR_VERB.has(lettersOf(w))) && v.e.some((o) => o !== d && o.g.some((k) => d.g.includes(k)));
  const after = new Map(aligned(now).filter((c) => !isLead(now, c)).map((c) => [key(c), c]));
  for (const c of aligned(was).filter((c) => !isLead(was, c))) {
    const d = after.get(key(c));
    if (!d) {
      out.push(`${c.t}|${key(c)}: no longer an aligned chunk`);
      continue;
    }
    after.delete(key(c));
    if (d.c !== c.c) out.push(`${c.t}|${key(c)}: confidence ${c.c} became ${d.c}`);
    const cut = c.t.split(/\s+/).filter(Boolean);
    const rest = d.t.split(/\s+/).filter(Boolean);
    const lead = cut.slice(0, cut.length - rest.length);
    const supplied = lead.every((w) => SUPPLIED_FOR_VERB.has(lettersOf(w)));
    if (c.t !== d.t && !(lead.length > 0 && cut.slice(lead.length).join(' ') === d.t && supplied)) out.push(`${c.t}|${key(c)}: text became ${d.t}`);
  }
  for (const d of after.values()) out.push(`${d.t}|${key(d)}: a new aligned chunk`);
  return out;
};

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

// the real Genesis with the model pass (the chapters that have a file in data/lxx/align): when the pinned sources and the Morpheus cache are on the disk, here or in the Laptop's checkout, and the work touches what they check (tests/support/lxx-real-data.ts);
// the gate's log says in one line when it is skipped and why. Sources found elsewhere than the cwd are given to runShip, so no symlink is needed.
// Genesis 20 is his own report (2026-11-10, mw-u2w5klk.349.2: a tap on 'removed' in Genesis 20:1 opened the Verse view). The chapters of the model pass are the files of data/lxx/align, so a pass adds no line here; what a pass
// adds by hand is the reasons of data/lxx/align/<book>.expect.json (npm run lxx:align-expect, docs/lxx-align.md 'A pairing pass').
const MODELLED = alignFileChapters('gen');
describe.skipIf(!haveSources)('Genesis with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  let shipped: Shipped;
  let shippedDir = '';
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'gen', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-model-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-model-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    shipped = await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    shippedDir = b;
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has a model file for each chapter its sidecar names (and the sidecar names no other), and none of its runs is stale', () => {
    const problems = expectBooks().flatMap((code) => checkFiles(code, readExpect(code)!, alignFileChapters(code)));
    expect(problems).toEqual([]);
    expect(readdirSync(ALIGN_CHOICES_DIR).filter((f) => f.startsWith('gen-') && f.endsWith('.tsv'))).toEqual(MODELLED.map((n) => alignChoicesName('gen', n)));
    expect(MODELLED.length).toBeGreaterThan(0);
    expect(stale).toEqual([]);
  });

  // The English content words that have no Greek word after the pass (mw-u2w5klk.349.2 and each pass since): each is named in the sidecar of its book with why (a key of its "reasons", or a sentence): the Greek word
  // that renders it is a pair the aligner made to another English word (the model re-chooses remainders, not pairs), or Brenton has no Greek word for it, or adds it. A tap on one opens the Verse view, never a wrong
  // word (septuagintChunkLinked). Every other unpaired chunk of a chapter is made of function words. A stale sidecar fails in one line that names the command (scripts/lxx/align-expect.ts checkLeftovers).
  it('leaves in each chapter no English content word without a Greek word but those its sidecar names, each with why', () => {
    const problems = expectBooks().flatMap((code) => {
      const expect = readExpect(code)!;
      const chapters = Object.entries(expect.chapters).filter(([, c]) => c.leftovers !== undefined).map(([n]) => Number(n));
      const measured = measureShipped(shippedDir, code, chapters, (n) => expect.chapters[String(n)]?.also ?? []);
      return checkLeftovers(code, expect, measured);
    });
    expect(problems).toEqual([]);
  });

  it('has the file of each book it ships under docs/lxx-align, and each is what the ship gives (for the books whose Morpheus cache here is the one the file was written with)', () => {
    const problems: string[] = [];
    for (const { code } of shipped.books) {
      const file = alignReportFile(code);
      const mine = shipped.aligned.filter((s) => s.code === code);
      if (mine.length === 0) continue;
      const without = shipped.withoutMorpheus.includes(code);
      if (!existsSync(file)) {
        problems.push(`${file} does not exist: run \`${expectCommand(code)}\``);
        continue;
      }
      const text = readFileSync(file, 'utf8');
      // which chapters ship depends on the books' Morpheus caches, and the file says which it was written without; a host with another answer cannot judge it (npm run lxx:align refuses it too)
      if (recordedWithout(text) !== withoutList(without ? [code] : [])) continue;
      if (text !== renderBookReport(mine, without)) problems.push(`${file} is stale: run \`${expectCommand(code)}\``);
    }
    expect(problems).toEqual([]);
  });

  it('re-chooses every remainder: no chunk is left y "align?", every model chunk has c and its Greek positions are real, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
        // a Greek word points at the last chunk that holds it; an earlier one is a lead chunk of supplied words paired to the verb (joinSupplied, mw-u2w5klk.274.14)
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Gen ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.e.forEach((chunk, i) => chunk.g.forEach((g) => expect(verse.g[g].e).toBeGreaterThanOrEqual(i)));
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g).toContain(k));
      }
    }
  });

  const fixRows = (n: number): ReturnType<typeof readModelRows> =>
    readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('gen', n)), 'utf8')).filter((r) => r.run === FIX_RUN);

  it('drops no word and no English: the chunks joined are Brenton\'s whole verse as the aligner had it, the Greek words are the same, and an aligned chunk is untouched, bar the supplied words the model paired with a Greek word of their own', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        const prior = was.verses[i];
        expect(joined(verse), `Gen ${n}:${verse.n}`).toBe(joined(prior));
        expect(verse.g.map((w) => w.t)).toEqual(prior.g.map((w) => w.t));
        const supplied = (v: Verse): number => v.e.reduce((a, c) => a + (c.s?.length ?? 0), 0);
        expect(supplied(verse)).toBe(supplied(prior));
        // an aligner chunk a fix row names (mw-u2w5klk.349.32) is one the fix changed on purpose; every other aligned chunk is untouched
        const fixText = fixRows(n).filter((r) => r.ref === `Gen.${n}:${verse.n}`).map((r) => r.text.split(/\s+/));
        const unmeant = alignedDiffs(prior, verse).filter((d) => !fixText.some((words) => d.split('|')[0].split(/\s+/).some((w) => words.includes(w))));
        expect(unmeant, `Gen ${n}:${verse.n}`).toEqual([]);
      });
    }
  });

  it('settles more of the Greek: more words have English than the aligner alone gave, in every chapter', () => {
    const paired = (c: Chapter): number => c.verses.reduce((a, v) => a + v.g.filter((w) => w.e !== undefined).length, 0);
    for (const [n, chapter] of withModel) expect(paired(chapter), `Gen ${n}`).toBeGreaterThan(paired(base.get(n)!));
  });

  it("pairs Genesis 20:1's 'removed' to ἐκίνησεν, which Swete has there, as a model chunk the Reader links (his report: the tap opened the Verse view)", () => {
    const verse = withModel.get(20)!.verses[0];
    const chunk = verse.e.find((c) => c.t === 'removed')!;
    expect(chunk, 'a chunk of its own').toBeDefined();
    expect(chunk.y).toBe('model');
    expect(chunk.c).toBe(0.8);
    expect(chunk.g.map((i) => verse.g[i].t)).toEqual(['ἐκίνησεν']);
    expect(septuagintChunkLinked(chunk)).toBe(true);
    // 'thence' too, and the country: no English word of the verse's first clause is left without a Greek word of its own, bar the 'the' a case ending carries
    expect(verse.e.filter((c) => !septuagintChunkLinked(c)).map((c) => c.t)).toEqual(['the']);
  });

  it('pairs a content word of each kind (Genesis 12:6 traversed, 15:6 believed, 17:17 fell, 19:1 rose, 22:3 arose) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[12, 6, 'traversed'], [15, 6, 'believed'], [17, 17, 'fell'], [19, 1, 'rose'], [22, 3, 'arose']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // Genesis 13:18, 16:9 and 22:13 (mw-u2w5klk.349.32; the Governor's own 'removed' of 2026-11-10): the aligner paired a Greek word to its neighbour's English ('tent,' to ἀποσκηνώσας, κυρίαν to 'Return', 'up' to
  // ἀναβλέψας and ἀνήνεγκεν) and a tap on the English word that renders it opened the Verse view or the wrong word. The fix rows (`fix` in data/lxx/align/gen-NN.tsv) give each Greek word to the words it renders.
  const chunkWith = (n: number, v: number, word: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(word))!;
  const greekOf = (n: number, v: number, chunk: EnglishChunk): string[] => chunk.g.map((i) => withModel.get(n)!.verses.find((x) => x.n === v)!.g[i].t);

  it("links Genesis 13:18's 'removed' to ἀποσκηνώσας, in the one chunk that holds 'tent,' as well: no other chunk of the verse holds that Greek word, so 'tent,' no longer opens it for 'removed'", () => {
    const chunk = chunkWith(13, 18, 'removed');
    expect(greekOf(13, 18, chunk)).toEqual(['ἀποσκηνώσας']);
    expect(chunk.t).toBe('having removed his tent,');
    expect(septuagintChunkLinked(chunk)).toBe(true);
    const verse = withModel.get(13)!.verses.find((x) => x.n === 18)!;
    expect(verse.e.filter((c) => c.g.some((i) => verse.g[i].t === 'ἀποσκηνώσας'))).toHaveLength(1);
  });

  it("links Genesis 16:9's 'Return' to Ἀποστράφηθι and 'mistress,' to κυρίαν, each to its own", () => {
    expect(greekOf(16, 9, chunkWith(16, 9, 'Return'))).toEqual(['Ἀποστράφηθι']);
    expect(greekOf(16, 9, chunkWith(16, 9, 'mistress,'))).toEqual(['κυρίαν']);
  });

  // Genesis 17:13 (mw-u2w5klk.349.40): the model's chunk 'money shall' held the 'money' that renders ἀργυρώνητος, which the aligner had paired to 'with'; the fix row cuts inside the chunk (applyFixes), and the
  // 'shall' it leaves joins 'be' (joinSupplied)
  it("links Genesis 17:13's 'money' to ἀργυρώνητος, in the one chunk that holds 'he that is bought with money', and leaves 'shall be' its own", () => {
    const chunk = chunkWith(17, 13, 'money');
    expect(chunk.t).toBe('he that is bought with money');
    expect(greekOf(17, 13, chunk)).toEqual(['ὁ', 'ἀργυρώνητος.']);
    expect(septuagintChunkLinked(chunk)).toBe(true);
    const verse = withModel.get(17)!.verses.find((x) => x.n === 13)!;
    expect(verse.e.filter((c) => c.g.some((i) => verse.g[i].t === 'ἀργυρώνητος.'))).toHaveLength(1);
    expect(verse.e.some((c) => c.t === 'shall be' && c.g.length > 0)).toBe(true);
    // 17:12's 'bought with money,' is the same Greek word, a whole chunk (17:27 and 17:23 too)
    expect(greekOf(17, 12, chunkWith(17, 12, 'money,'))).toEqual(['ἀργυρώνητος']);
  });

  it("links Genesis 22:13's 'lifted' to ἀναβλέψας and 'offered' to ἀνήνεγκεν, and 'whole burnt offering' to ὁλοκάρπωσιν; the same 'lifted up' in 18:2 and 22:4", () => {
    expect(greekOf(22, 13, chunkWith(22, 13, 'lifted'))).toEqual(['ἀναβλέψας']);
    expect(greekOf(22, 13, chunkWith(22, 13, 'offered'))).toEqual(['ἀνήνεγκεν']);
    expect(chunkWith(22, 13, 'burnt').t).toBe('a whole burnt offering');
    expect(greekOf(22, 13, chunkWith(22, 13, 'burnt'))).toEqual(['ὁλοκάρπωσιν']);
    expect(greekOf(18, 2, chunkWith(18, 2, 'lifted'))).toEqual(['ἀναβλέψας']);
    expect(greekOf(22, 4, chunkWith(22, 4, 'lifted'))).toEqual(['ἀναβλέψας']);
  });

  // Genesis 12 to 23 (mw-u2w5klk.349.83, folding mw-u2w5klk.349.38 and .82): 'it came to pass' renders one Greek word (ἐγένετο, Hebrew's 'and it was'), which the aligner paired to the 'to' alone, so its other words
  // had no Greek; and in Genesis 15, 19, 21 and 23 the aligner paired Greek words to a neighbouring English word, so the word that renders each had none. Each is a fix row (applyFixes) named here, with the
  // Greek words its one chunk renders.
  const READ_AS_ONE: Array<[number, number, string, string[]]> = [
    [12, 11, 'it came to pass', ['ἐγένετο']],
    [12, 12, 'It shall come to pass', ['ἔσται']],
    [12, 14, 'it came to pass', ['ἐγένετο']],
    [14, 1, 'it came to pass', ['Ἐγένετο']],
    [19, 17, 'it came to pass', ['ἐγένετο']],
    [19, 29, 'it came to pass that when', ['ἐγένετο', 'ἐν', 'τῷ']],
    [19, 34, 'it came to pass', ['ἐγένετο']],
    [20, 13, 'it came to pass', ['ἐγένετο']],
    [21, 22, 'it came to pass at', ['Ἐγένετο', 'δὲ', 'ἐν', 'τῷ']],
    [22, 1, 'it came to pass', ['ἐγένετο']],
    [22, 20, 'it came to pass', ['Ἐγένετο·']],
  ];
  const MISPAIRS: Array<[number, number, string, string[]]> = [
    [12, 12, 'his', ['αὐτοῦ']],
    [12, 12, 'This', ['αὐτή·']],
    [15, 1, 'reward', ['μισθός']],
    [15, 1, 'great.', ['πολὺς']],
    [15, 3, 'my home-born servant', ['οἰκογενής', 'μου']],
    [15, 3, 'I am grieved', []],
    [15, 5, 'Look up', ['Ἀνάβλεψον']],
    [15, 5, 'count', ['ἀρίθμησον']],
    [15, 5, 'number them fully,', ['ἐξαριθμῆσαι', 'αὐτούς.']],
    [15, 9, 'in her third year,', ['τριετίζουσαν']],
    [15, 9, 'a she-goat in her third year,', ['αἶγα', 'τριετίζουσαν']],
    [15, 9, 'in his third year,', ['τριετίζοντα']],
    [15, 13, 'four hundred', ['τετρακόσια']],
    [15, 17, 'divided pieces.', ['διχοτομημάτων']],
    [19, 2, 'turn aside', ['ἐκκλίνατε']],
    [19, 2, 'having risen early in the morning', ['ὀρθρίσαντες']],
    [19, 2, 'you⌃', []],
    [19, 2, 'on your journey.', ['εἰς', 'τὴν', 'ὁδὸν', 'ὑμῶν.']],
    [19, 3, 'they turned aside', ['ἐξέκλιναν']],
    [19, 3, 'unleavened cakes', ['ἀζύμους']],
    [19, 4, 'But', ['καὶ']],
    [19, 4, 'they went to sleep,', ['κοιμηθῆναι.']],
    [19, 4, 'young and old,', ['νεανίσκου', 'ἕως', 'πρεσβυτέρου,']],
    [19, 7, 'act villanously.', ['πονηρεύσησθε.']],
    [19, 9, 'they drew near', ['ἤγγισαν']],
    [19, 10, 'stretched forth', ['ἐκτείναντες']],
    [19, 13, 'are going to destroy', ['ἀπόλλυμεν']],
    [19, 14, 'depart out', ['ἐξέλθατε']],
    [19, 15, 'go forth;', ['ἔξελθε,']],
    [19, 15, 'you also be destroyed with', ['συναπόλῃ']],
    [19, 17, 'look not round', ['μὴ', 'περιβλέψῃς']],
    [19, 28, 'went up', ['ἀνέβαινεν']],
    [19, 29, 'in which', ['ἐν', 'αἷς', 'ἐν', 'αὐταῖς']],
    [19, 32, 'let us make our father drink', ['ποτίσωμεν', 'πατέρα', 'ἡμῶν']],
    [19, 33, 'they made their father drink', ['ἐπότισαν', 'πατέρα', 'αὐτῶν']],
    [19, 33, 'in that night,', ['ἐν', 'τῇ', 'νυκτὶ', 'ταύτῃ,']],
    [19, 33, 'went in', ['εἰσελθοῦσα']],
    [19, 33, 'her father', ['πατρὸς', 'αὐτῆς']],
    [19, 33, 'he knew not', ['οὐκ', 'ᾔδει']],
    [19, 33, 'when he slept', ['ἐν', 'τῷ', 'κοιμηθῆναι']],
    [19, 34, 'let us make him drink', ['ποτίσωμεν', 'αὐτὸν']],
    [19, 35, 'they made their father drink', ['ἐπότισαν', 'πατέρα', 'αὐτῶν']],
    [19, 35, 'went in', ['εἰσελθοῦσα']],
    [19, 35, 'her father,', ['πατρὸς', 'αὐτῆς·']],
    [19, 35, 'he knew not', ['οὐκ', 'ᾔδει']],
    [19, 35, 'when he slept,', ['ἐν', 'τῷ', 'κοιμηθῆναι']],
    [20, 13, 'brought me forth', ['ἐξήγαγέν', 'με']],
    [21, 2, 'in old age,', ['εἰς', 'γῆρας,']],
    [21, 2, 'at the set time', ['εἰς', 'τὸν', 'καιρὸν']],
    [21, 2, 'according as', ['καθὰ']],
    [21, 2, 'to him.', ['αὐτῷ']],
    [21, 5, 'one hundred years old', ['ἑκατὸν', 'ἐτῶν,']],
    [21, 5, 'was born to him.', ['ἐγένετο', 'αὐτῷ']],
    [21, 5, 'his', ['αὐτοῦ.']],
    [21, 6, 'shall rejoice with', ['συγχαρεῖταί']],
    [21, 13, 'bondwoman', ['παιδίσκης']],
    [21, 13, 'a great nation,', ['εἰς', 'ἔθνος', 'μέγα']],
    [21, 16, 'Surely I can’t', ['Οὐ', 'μὴ']],
    [21, 16, 'of my child:', ['τοῦ', 'παιδίου', 'μου.']],
    [21, 16, 'cried aloud', ['ἀναβοῆσαν']],
    [21, 19, 'gave the child drink.', ['ἐπότισεν', 'τὸ', 'παιδίον.']],
    [21, 22, 'that time', ['καιρῷ', 'ἐκείνῳ']],
    [21, 22, 'that Abimelech', ['Ἀβιμέλεχ']],
    [21, 22, 'in all things,', ['ἐν', 'πᾶσιν']],
    [21, 22, 'whatever you may do.', ['οἷς', 'ἐὰν', 'ποιῇς.']],
    [21, 22, 'the chief captain', ['ὁ', 'ἀρχιστράτηγος']],
    [21, 22, 'of his host,', ['τῆς', 'δυνάμεως', 'αὐτοῦ']],
    [21, 25, 'because of', ['περὶ']],
    [21, 26, 'but only today.', ['ἀλλὰ', 'σήμερον.']],
    [21, 26, 'tell it', ['ἀπήγγειλας,']],
    [21, 26, 'neither heard', ['οὐδὲ', 'ἤκουσα']],
    [22, 20, 'herself too has', ['καὶ', 'αὐτὴ']],
    [23, 1, 'one hundred and twenty-seven', ['ἑκατὸν', 'εἴκοσι', 'ἑπτά.']],
    [23, 13, 'on my side,', ['πρὸς', 'ἐμοῦ']],
    [23, 15, 'Nay, my lord,', ['Οὐχί,', 'κύριε,']],
    [23, 15, 'you?', ['σοῦ']],
    [23, 15, 'you bury', ['σὺ', 'θάψον.']],
    [23, 15, 'your dead.', ['νεκρόν', 'σου']],
    [23, 15, 'the land is worth', []],
    [23, 16, 'four hundred', ['τετρακόσια']],
    [23, 17, 'were made sure', ['ἔστη']],
    [23, 17, 'and whatever is in its borders round about,', ['ὅ', 'ἐστιν']],
    [23, 17, 'in its borders round about, were made sure', ['ἐν', 'τοῖς', 'ὁρίοις', 'αὐτοῦ', 'κύκλῳ,']],
    [15, 12, 'sunset', ['ἡλίου', 'δυσμὰς']],
    [15, 12, 'a trance', ['ἔκστασις']],
    [15, 12, 'fell upon', ['ἐπέπεσεν']],
    [17, 7, 'I will establish', ['στήσω']],
    [17, 7, 'my covenant', ['διαθήκην', 'μου', 'ἐμοῦ']],
    [17, 7, 'between', ['ἀνὰ', 'μέσον', 'ἀνὰ', 'μέσον']],
    [18, 28, 'the whole', ['πᾶσαν', 'τὴν']],
    [18, 28, 'because of the five lacking?', ['ἕνεκεν', 'τῶν', 'πέντε']],
    [20, 3, 'has lived with', ['ἐστιν', 'συνῳκηκυῖα']],
    [21, 15, 'a', ['μιᾶς']],
    [21, 15, 'fir tree.', ['ἐλάτης·']],
    [23, 4, 'am a', ['εἰμι']],
    [23, 4, 'among you,', ['μεθ᾽', 'ὑμῶν·']],
    [23, 6, 'one of us will by any means withhold', ['οὐδεὶς', 'ἡμῶν', 'κωλύσει']],
    [23, 6, 'his sepulchre', ['τὸ', 'μνημεῖον', 'αὐτοῦ']],
    [23, 6, 'from you,', ['ἀπὸ', 'σοῦ,']],
    [23, 6, 'you should not', []],
    [23, 6, 'your dead there.', ['νεκρόν', 'σου', 'ἐκεῖ.']],
  ];
  const chunkTexted = (n: number, v: number, text: string): EnglishChunk | undefined => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t === text);

  it("gives 'it came to pass' of Genesis 12 to 23 one chunk of ἐγένετο, and leaves no chunk of those chapters with 'came' or 'pass' and no Greek word", () => {
    for (const [n, v, text, greek] of READ_AS_ONE) {
      const chunk = chunkTexted(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(greekOf(n, v, chunk!), `${n}:${v} ${text}`).toEqual(greek);
      expect(septuagintChunkLinked(chunk!), `${n}:${v} ${text}`).toBe(true);
    }
    const bare: string[] = [];
    for (const [n, chapter] of withModel) {
      if (n < 12 || n > 23) continue;
      for (const verse of chapter.verses) for (const c of verse.e) if (c.g.length === 0 && c.t.split(/\s+/).some((w) => /^(came|pass)$/.test(lettersOf(w)))) bare.push(`${n}:${verse.n} ${c.t}`);
    }
    expect(bare).toEqual([]);
  });

  it("gives each Greek word of Genesis 12 to 23 (the aligner pairs the sweep found, mostly in 15, 19, 21 and 23) that sat on a neighbouring English chunk to the words that render it (the fix rows of those chapters, each named here)", () => {
    for (const [n, v, text, greek] of MISPAIRS) {
      const chunk = chunkTexted(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(greekOf(n, v, chunk!), `${n}:${v} ${text}`).toEqual(greek);
    }
  });

  it('applies every fix row it has: none is stale, and none of a chapter leaves a Greek word it had paired without English', () => {
    expect(stale).toEqual([]);
    for (const n of MODELLED) {
      const rows = fixRows(n);
      if (rows.length === 0) continue;
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Gen.${n}:${x.n}` === r.ref)!;
        expect(verse.e.some((c) => c.y === 'model' && c.t === r.text && c.g.join(',') === r.g.join(',')), `${r.ref} ${r.text}`).toBe(true);
      }
    }
  });

  it('pairs a content word of each kind (Genesis 24:2 servant, 25:29 cooked, 26:19 dug, 27:15 raiment, 28:2 depart, 29:11 kissed) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[24, 2, 'servant'], [25, 29, 'cooked'], [26, 19, 'dug'], [27, 15, 'raiment'], [28, 2, 'depart'], [29, 11, 'kissed']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  it('pairs a content word of each kind (Genesis 30:14 barley, 31:10 conceived, 32:17 whither, 33:4 kissed, 34:10 trade, 35:2 purify yourselves) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[30, 14, 'barley'], [31, 10, 'conceived'], [32, 17, 'whither'], [33, 4, 'kissed'], [34, 10, 'trade,'], [35, 2, 'purify']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // mw-u2w5klk.349.46: the aligner's pairs of Genesis 14 gave a Greek word to a neighbouring English word ('nations' on ἅμα, 'with' on συνεφώνησαν, 'country.' on ἔφυγον, 'nephew,' on the second
  // ἀπέστρεψεν, 'upon' on ἐπέπεσεν), so the word that renders it had no Greek. Each is the chunk the fix row of gen-14.tsv gives its own Greek word.
  it('gives the English of Genesis 14 that the aligner paired to a neighbour its own Greek word: nations, met with one consent, cut to pieces, fled, nephew, he recovered Lot, he came upon, most high, made Abram rich', () => {
    const verse = (v: number): Verse => withModel.get(14)!.verses.find((x) => x.n === v)!;
    const greek = (v: number, text: string): string[] => {
      const chunks = verse(v).e.filter((c) => c.t === text);
      expect(chunks, `14:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse(v).g[i].t);
    };
    expect(greek(3, 'met with one consent')).toEqual(['συνεφώνησαν']);
    expect(greek(5, 'strong nations')).toEqual(['ἔθνη', 'ἰσχυρὰ']);
    expect(greek(5, 'with them,')).toEqual(['ἅμα', 'αὐτοῖς,']);
    expect(greek(5, 'cut to pieces')).toEqual(['κατέκοψαν']);
    expect(greek(7, 'they cut in pieces')).toEqual(['κατέκοψαν']);
    expect(greek(8, 'they set themselves in array against them for')).toEqual(['παρετάξαντο', 'αὐτοῖς', 'εἰς']);
    expect(greek(10, 'the salt valley')).toEqual(['ἡ', 'κοιλὰς', 'ἡ', 'ἁλυκὴ']);
    expect(greek(10, 'consists of slime-pits.')).toEqual(['φρέατα', 'ἀσφάλτου.']);
    expect(greek(10, 'Sodom fled')).toEqual(['ἔφυγεν', 'Σοδόμων']);
    expect(greek(10, 'they that were left fled')).toEqual(['οἱ', 'καταλειφθέντες', 'ἔφυγον.']);
    expect(greek(10, 'mountain country.')).toEqual(['ὀρινὴν']);
    expect(greek(14, 'nephew had been')).toEqual(['ὁ', 'ἀδελφὸς']);
    expect(greek(14, 'taken captive,')).toEqual(['ᾐχμαλωτεύθη']);
    expect(greek(14, 'home-born servants')).toEqual(['οἰκογενεῖς']);
    expect(greek(15, 'he came upon')).toEqual(['ἐπέπεσεν', 'ἐπ᾽']);
    expect(greek(16, 'he recovered Lot')).toEqual(['Λὼτ', 'ἀπέστρεψεν']);
    expect(greek(16, 'nephew,')).toEqual(['ἀδελφὸν']);
    expect(greek(18, 'brought forth')).toEqual(['ἐξήνεγκεν']);
    expect(greek(18, 'most high')).toEqual(['ὑψίστου.']);
    expect(greek(19, 'most high')).toEqual(['ὑψίστῳ,']);
    expect(greek(20, 'most high')).toEqual(['ὕψιστος,']);
    expect(greek(20, 'Abram gave')).toEqual(['ἔδωκεν']);
    expect(greek(22, 'most high')).toEqual(['ὕψιστον,']);
    expect(greek(23, 'have made Abram rich.')).toEqual(['ἐπλούτισα', 'τὸν', 'Ἀβράμ.']);
    expect(greek(24, 'Except what things')).toEqual(['πλήν', 'ὧν']);
    expect(greek(24, 'young men')).toEqual(['νεανίσκοι']);
    expect(greek(24, 'that went')).toEqual(['τῶν', 'συμπορευθέντων']);
  });

  it('pairs a content word of each kind in Genesis 14 (11 cavalry, 18 loaves, 13 told, 7 Amorites, 15 servants, 23 string) to a Greek word the Reader links', () => {
    const chunkOf = (v: number, text: string): EnglishChunk => withModel.get(14)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [v, text] of [[11, 'cavalry'], [18, 'loaves'], [13, 'told'], [7, 'Amorites'], [15, 'servants,'], [23, 'string']] as const) {
      const chunk = chunkOf(v, text);
      expect(chunk, `14:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `14:${v} ${text}`).toBe(true);
    }
  });

  it('pairs a content word of each kind (Genesis 37:3 coat, 37:25 myrrh, 38:8 brother-in-law, 38:22 harlot, 39:6 exceedingly, 39:19 angry) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[37, 3, 'coat'], [37, 25, 'myrrh;'], [38, 8, 'brother-in-law,'], [38, 22, 'harlot'], [39, 6, 'exceedingly'], [39, 19, 'angry.']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // mw-u2w5klk.349.47's sweep of the aligner's pairs in Genesis 37 to 39: a Greek word the aligner gave to a neighbouring English word, so the word that renders it had no Greek ('brought' on ψόγον, 'having' on ἐξείλατο,
  // 'Hebrew' and 'servant' on each other's words, 'are' on ὢν, the 'it' of 'it came to pass' on a word of the next phrase). Each is the chunk a fix row gives its own Greek word.
  it('gives the English of Genesis 37 to 39 that the aligner paired to a neighbour its own Greek word: brought, reproach, rescued him, captain of the guard, Hebrew servant, am with child, it came to pass', () => {
    const greek = (n: number, v: number, text: string): string[] => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunks = verse.e.filter((c) => c.t === text);
      expect(chunks, `${n}:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse.g[i].t);
    };
    expect(greek(37, 2, 'brought')).toEqual(['κατήνεγκαν']);
    expect(greek(37, 2, 'reproach.')).toEqual(['ψόγον']);
    expect(greek(37, 2, 'seventeen')).toEqual(['δέκα', 'ἑπτὰ']);
    expect(greek(37, 7, 'turned round,')).toEqual(['περιστραφέντα']);
    expect(greek(37, 20, 'wild beast has')).toEqual(['Θηρίον']);
    expect(greek(37, 21, 'it, rescued him')).toEqual(['ἐξείλατο', 'αὐτὸν']);
    expect(greek(37, 21, 'having')).toEqual([]);
    expect(greek(37, 23, 'it came to pass,')).toEqual(['ἐγένετο']);
    expect(greek(37, 36, 'captain of the guard.')).toEqual(['ἀρχιμαγείρῳ.']);
    expect(greek(38, 1, 'it came to pass')).toEqual(['Ἐγένετο']);
    expect(greek(38, 8, 'marry her as her brother-in-law,')).toEqual(['γάμβρευσαι', 'αὐτήν,']);
    expect(greek(38, 24, 'harlot,')).toEqual(['Ἐκπεπόρνευκεν']);
    expect(greek(38, 25, 'am with child')).toEqual(['ἐν', 'γαστρὶ', 'ἔχω·']);
    expect(greek(38, 28, 'scarlet thread,')).toEqual(['κόκκινον']);
    expect(greek(39, 14, 'Hebrew')).toEqual(['Ἐβραῖον']);
    expect(greek(39, 14, 'servant')).toEqual(['παῖδα']);
    expect(greek(39, 17, 'Hebrew')).toEqual(['Ἐβραῖος,']);
    expect(greek(39, 17, 'servant,')).toEqual(['παῖς']);
    expect(greek(39, 19, 'all the words')).toEqual(['τὰ', 'ῥήματα', 'ὅσα']);
    expect(greek(39, 23, 'knew nothing,')).toEqual(['οὐκ', 'ἦν', 'γινώσκων', 'οὐθέν·']);
  });

  it('pairs a content word of each kind (Genesis 40:10 clusters, 40:17 baker, 41:42 robe, 41:55 hungry, 42:5 famine, 42:25 vessels) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[40, 10, 'clusters'], [40, 17, 'baker'], [41, 42, 'robe'], [41, 55, 'hungry;'], [42, 5, 'famine'], [42, 25, 'vessels']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // mw-u2w5klk.349.48's sweep of the aligner's pairs in Genesis 40 to 42: a Greek word the aligner gave to a neighbouring English word, so the word that renders it had no Greek ('cows' of 41:4 on σαρξὶν and 'cows;' on ἠγέρθη,
  // 'clusters' and 'grapes' of 40:10 on each other's neighbour, 'interpreted' and 'aright;' of 40:16 swapped, 'Nay,' and 'Sir,' of 42:10, the two 'are' of 42:11 and 42:31, the 'it' of every 'it came to pass').
  // Each is the chunk a fix row gives its own Greek word.
  it('gives the English of Genesis 40 to 42 that the aligner paired to a neighbour its own Greek word: it came to pass, cows, clusters, grapes, interpreted, lift up, Nay, Sir, understood, we are not', () => {
    const greek = (n: number, v: number, text: string): string[] => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunks = verse.e.filter((c) => c.t === text);
      expect(chunks, `${n}:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse.g[i].t);
    };
    expect(greek(40, 1, 'it came to pass')).toEqual(['Ἐγένετο']);
    expect(greek(40, 1, 'these things,')).toEqual(['τὰ', 'ῥήματα', 'ταῦτα']);
    expect(greek(40, 1, 'trespassed against their')).toEqual(['ἥμαρτεν', 'αὐτῶν']);
    expect(greek(40, 1, 'chief cupbearer')).toEqual(['ἀρχιοινοχόος']);
    expect(greek(40, 8, 'it.')).toEqual(['αὐτὸ']);
    expect(greek(40, 8, 'them,')).toEqual(['αὐτοῖς']);
    expect(greek(40, 10, 'clusters of')).toEqual(['βότρυες']);
    expect(greek(40, 10, 'grapes')).toEqual(['σταφυλῆς.']);
    expect(greek(40, 10, 'ripe.')).toEqual(['πέπειροι']);
    expect(greek(40, 13, 'your place of chief cupbearer,')).toEqual(['τὴν', 'ἀρχιοινοχοίαν', 'σου,']);
    expect(greek(40, 16, 'he interpreted')).toEqual(['συνέκρινεν,']);
    expect(greek(40, 16, 'aright;')).toEqual(['ὀρθῶς']);
    expect(greek(40, 17, 'of every kind')).toEqual(['ἀπὸ', 'πάντων', 'τῶν', 'γενημάτων']);
    expect(greek(40, 20, 'birth-day,')).toEqual(['ἡμέρα', 'γενέσεως']);
    expect(greek(41, 3, 'the other cows')).toEqual(['αἱ', 'βόες']);
    expect(greek(41, 4, 'cows')).toEqual(['βόες']);
    expect(greek(41, 4, 'cows;')).toEqual(['βόας']);
    expect(greek(41, 4, 'awoke.')).toEqual(['ἠγέρθη']);
    expect(greek(41, 7, 'thin ears')).toEqual(['στάχυες', 'λεπτοὶ']);
    expect(greek(41, 8, 'her wise men;')).toEqual(['τοὺς', 'σοφοὺς', 'αὐτῆς·']);
    expect(greek(41, 29, 'great')).toEqual(['πολλὴ']);
    expect(greek(41, 29, 'plenty')).toEqual(['εὐθηνία']);
    expect(greek(41, 37, 'the word was')).toEqual(['τὰ', 'ῥήματα']);
    expect(greek(41, 37, 'pleasing in the sight of')).toEqual(['Ἤρεσεν', 'ἐναντίον']);
    expect(greek(41, 42, 'put on him')).toEqual(['ἐνέδυσεν', 'αὐτὸν']);
    expect(greek(41, 44, 'no one')).toEqual(['οὐκ', 'οὐθεὶς']);
    expect(greek(41, 44, 'shall lift up')).toEqual(['ἐξαρεῖ']);
    expect(greek(42, 10, 'Nay,')).toEqual(['Οὐχί,']);
    expect(greek(42, 10, 'Sir,')).toEqual(['κύριε·']);
    expect(greek(42, 21, 'we are in fault')).toEqual(['ἐν', 'ἁμαρτίᾳ', 'ἐσμεν']);
    expect(greek(42, 21, 'us.')).toEqual(['ἡμᾶς']);
    expect(greek(42, 23, 'knew not')).toEqual(['οὐκ', 'ᾔδεισαν']);
    expect(greek(42, 23, 'understood')).toEqual(['ἀκούει']);
    expect(greek(42, 31, 'we are not')).toEqual(['οὐκ', 'ἐσμὲν']);
    expect(greek(42, 35, 'it came to pass')).toEqual(['ἐγένετο']);
    expect(greek(42, 36, 'to them,')).toEqual(['αὐτοῖς']);
    expect(greek(42, 37, 'and I will bring him back')).toEqual(['κἀγὼ', 'ἀνάξω', 'αὐτὸν']);
  });

  it('pairs a content word of each kind (Genesis 43:11 turpentine, 43:30 chamber, 44:12 youngest, 44:17 safety, 45:6 plowing, 45:27 chariots) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[43, 11, 'turpentine,'], [43, 30, 'chamber,'], [44, 12, 'youngest;'], [44, 17, 'safety'], [45, 6, 'plowing,'], [45, 27, 'chariots']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // mw-u2w5klk.349.49's sweep of the aligner's pairs in Genesis 43 to 45: a Greek word the aligner gave to a neighbouring English word, so the word that renders it had no Greek ('presents,' of 43:15 on 'having's δῶρα,
  // 'rose up' and 'went' of 43:15, 'looked' and 'every one' of 43:33, 'drew near' of 44:18, 'wife' and 'sons;' of 44:27, 'Joseph's brethren' and 'was glad,' of 45:16, 'sent' and 'away' of 45:24, the 'it came to pass' of 43:2).
  // Each is the chunk a fix row gives its own Greek word.
  it('gives the English of Genesis 43 to 45 that the aligner paired to a neighbour its own Greek word: it came to pass, presents, rose up, every one at, drew near, wife, Joseph\'s brethren, was glad, sent away', () => {
    const greek = (n: number, v: number, text: string): string[] => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunks = verse.e.filter((c) => c.t === text);
      expect(chunks, `${n}:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse.g[i].t);
    };
    expect(greek(43, 2, 'it came to pass,')).toEqual(['ἐγένετο']);
    expect(greek(43, 9, 'engage for')).toEqual(['ἐκδέχομαι']);
    expect(greek(43, 10, 'should now have')).toEqual(['ἤδη', 'ἂν']);
    expect(greek(43, 12, 'lest perhaps')).toEqual(['μή', 'ποτε']);
    expect(greek(43, 12, 'a mistake.')).toEqual(['ἀγνόημά']);
    expect(greek(43, 14, 'send away')).toEqual(['ἀποστείλαι']);
    expect(greek(43, 14, 'accordingly as')).toEqual(['καθὰ']);
    expect(greek(43, 15, 'presents,')).toEqual(['τὰ', 'δῶρα']);
    expect(greek(43, 15, 'rose up')).toEqual(['ἀναστάντες']);
    expect(greek(43, 15, 'went down')).toEqual(['κατέβησαν']);
    expect(greek(43, 16, 'to the steward of his household,')).toEqual(['τῷ', 'ἐπὶ', 'τῆς', 'οἰκίας', 'αὐτοῦ']);
    expect(greek(43, 16, 'make ready,')).toEqual(['ἑτοίμασον·']);
    expect(greek(43, 18, 'lay it to our charge;')).toEqual(['ἐπιθέσθαι', 'ἡμῖν,']);
    expect(greek(43, 23, 'he brought Symeon out')).toEqual(['ἐξήγαγεν', 'Συμεών·']);
    expect(greek(43, 32, 'feasting with')).toEqual(['τοῖς', 'συνδειπνοῦσιν', 'μετ᾽']);
    expect(greek(43, 33, 'looked with amazement')).toEqual(['ἐξίσταντο']);
    expect(greek(43, 33, 'every one at')).toEqual(['ἕκαστος', 'πρὸς', 'τὸν']);
    expect(greek(43, 34, 'were filled with drink')).toEqual(['ἐμεθύσθησαν']);
    expect(greek(43, 34, 'the others.')).toEqual(['πρὸς', 'τὰς', 'ἐκείνων.']);
    expect(greek(44, 2, 'was done')).toEqual(['ἐγενήθη']);
    expect(greek(44, 3, 'sent away,')).toEqual(['ἀπεστάλησαν,']);
    expect(greek(44, 4, 'had gone')).toEqual(['ἐξελθόντων']);
    expect(greek(44, 4, 'far off,')).toEqual(['ἀπέσχον', 'μακράν,']);
    expect(greek(44, 7, 'according to this word.')).toEqual(['τὸ', 'ῥῆμα', 'τοῦτο.']);
    expect(greek(44, 11, 'every man his sack')).toEqual(['ἕκαστος', 'τὸν', 'μάρσιππον', 'αὐτοῦ']);
    expect(greek(44, 18, 'drew near')).toEqual(['Ἐγγίσας']);
    expect(greek(44, 18, 'with your servant,')).toEqual(['τῷ', 'παιδί', 'σου,']);
    expect(greek(44, 18, 'next to Pharao.')).toEqual(['μετὰ', 'Φαραώ.']);
    expect(greek(44, 20, 'left behind to his mother,')).toEqual(['ὑπελείφθη', 'τῷ', 'πατρὶ', 'αὐτοῦ,']);
    expect(greek(44, 26, 'if our younger brother go down')).toEqual(['εἰ', 'μὲν', 'ὁ', 'ἀδελφὸς', 'ὁ', 'νεώτερος', 'καταβαίνει']);
    expect(greek(44, 27, 'wife')).toEqual(['ἡ', 'γυνή.']);
    expect(greek(44, 27, 'two sons;')).toEqual(['δύο']);
    expect(greek(44, 28, 'devoured of wild beasts,')).toEqual(['Θηριόβρωτος']);
    expect(greek(44, 31, 'the old age')).toEqual(['τὸ', 'γῆρας']);
    expect(greek(44, 31, 'servant,')).toEqual(['τοῦ', 'παιδός']);
    expect(greek(44, 32, 'has received the boy in charge')).toEqual(['ἐκδέδεκται', 'τὸ', 'παιδίον']);
    expect(greek(44, 32, 'for ever.')).toEqual(['πάσας', 'τὰς', 'ἡμέρας.']);
    expect(greek(45, 1, 'stood near')).toEqual(['παριστήκει']);
    expect(greek(45, 16, 'Joseph\'s brethren')).toEqual(['οἱ', 'ἀδελφοὶ', 'Ἰωσήφ·']);
    expect(greek(45, 16, 'was glad,')).toEqual(['ἐχάρη']);
    expect(greek(45, 22, 'three hundred pieces of gold,')).toEqual(['τριακοσίους', 'χρυσοῦς']);
    expect(greek(45, 23, 'presents at the same rate,')).toEqual(['κατὰ', 'τὰ', 'αὐτά,']);
    expect(greek(45, 24, 'he sent away')).toEqual(['ἐξαπέστειλεν']);
    expect(greek(45, 24, 'his brethren,')).toEqual(['τοὺς', 'ἀδελφοὺς', 'αὐτοῦ']);
  });

  // Genesis 46 to 48 (mw-u2w5klk.349.50; `lxx:unpaired` listed them with 35, 109 and 42 English content words where a tap opened the Verse view): after the pass the 33 content words that sit in a chunk with no Greek
  // word are the sidecar's leftovers (data/lxx/align/gen.expect.json, 'other-verse-46-48' and 'added-46-48', checked above with every other chapter), and no remainder (y 'align?') is left.
  it('leaves no remainder in Genesis 46 to 48 and links a content word of each kind (46:3 nation, 46:5 wives, 47:3 servants, 47:27 inheritance, 48:2 sat, 48:22 select) to a Greek word the Reader links', () => {
    for (const n of [46, 47, 48]) for (const verse of withModel.get(n)!.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[46, 3, 'nation.'], [46, 5, 'wives'], [47, 3, 'servants'], [47, 27, 'inheritance'], [48, 2, 'sat'], [48, 22, 'select']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // Genesis 49 to 50 (mw-u2w5klk.349.51; `lxx:unpaired` listed them with English content words where a tap opened the Verse view): after the pass no remainder (y 'align?') is left, and the content words
  // that sit in a chunk with no Greek word are the sidecar's leftovers (data/lxx/align/gen.expect.json, checked above with every other chapter).
  it('leaves no remainder in Genesis 49 to 50 and links a content word of each kind (49:6 conspiracy, 49:11 garment, 49:19 plunder, 50:2 embalmed, 50:9 company, 50:21 families) to a Greek word the Reader links', () => {
    for (const n of [49, 50]) for (const verse of withModel.get(n)!.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[49, 6, 'conspiracy,'], [49, 11, 'garment'], [49, 19, 'plunder'], [50, 2, 'embalmed'], [50, 9, 'company.'], [50, 21, 'families:']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // mw-u2w5klk.349.50's sweep of the aligner's pairs in Genesis 46 to 48: a Greek word the aligner gave to a neighbouring English word, so the word that renders it had no Greek ('bring' of 46:4 sat beside ἀναβιβάσω on 'up',
  // 'born' of 46:20 on ἔτεκεν with 'bore' on πόλεως, 'wives' of 46:26 on μηρῶν, 'souls.' of 46:27 on πέντε, 'gladly' and 'die,' of 46:30 each on the other's word, 'herdsmen' of 46:34 on παῖδές, 'servants,' of 47:4 on ἐνίσχυσεν,
  // 'sold' of 47:20 on γῆν, 'presence?' of 47:15 on ἐκλέλοιπεν, 'it came to pass' of 48:1 on 'to', 'drew near' and 'brought them near' of 48:7, 48:10 and 48:13, 'Sicima' of 48:22 on 'portion'). Each is the chunk a fix row gives its own Greek word.
  it('gives the English of Genesis 46 to 48 that the aligner paired to a neighbour its own Greek word: will bring you up, there were sons born, bore, loins, seventy-five souls, gladly die, we your servants are herdsmen, famine has prevailed, sold, it came to pass, drew near, Sicima', () => {
    const greek = (n: number, v: number, text: string): string[] => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunks = verse.e.filter((c) => c.t === text);
      expect(chunks, `${n}:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse.g[i].t);
    };
    expect(greek(46, 4, 'will bring you up at the end;')).toEqual(['ἀναβιβάσω', 'σε', 'εἰς', 'τέλος·']);
    expect(greek(46, 4, 'his hands')).toEqual(['τὰς', 'χεῖρας']);
    expect(greek(46, 4, 'your eyes.')).toEqual(['τοὺς', 'ὀφθαλμούς', 'σου.']);
    expect(greek(46, 10, 'Chananitish woman.')).toEqual(['Χανανίτιδος.']);
    expect(greek(46, 15, 'thirty-three.')).toEqual(['τριάκοντα', 'τρεῖς.']);
    expect(greek(46, 20, 'there were sons born to Joseph')).toEqual(['ἐγένοντο', 'υἱοὶ', 'Ἰωσὴφ']);
    expect(greek(46, 20, 'Heliopolis,')).toEqual(['Ἡλίου', 'πόλεως,']);
    expect(greek(46, 20, 'bore')).toEqual(['ἔτεκεν']);
    expect(greek(46, 20, 'there were sons born to Manasses,')).toEqual(['ἐγένοντο', 'υἱοὶ', 'Μαννασσή,']);
    expect(greek(46, 20, 'concubine bore to him,')).toEqual(['ἔτεκεν', 'αὐτῷ', 'παλλακὴ']);
    expect(greek(46, 22, 'eighteen.')).toEqual(['δέκα', 'ὀκτώ.']);
    expect(greek(46, 26, 'loins,')).toEqual(['τῶν', 'μηρῶν']);
    expect(greek(46, 26, 'the wives')).toEqual(['γυναικῶν']);
    expect(greek(46, 26, 'sixty-six.')).toEqual(['ἑξήκοντα', 'ἕξ.']);
    expect(greek(46, 27, 'were born to him')).toEqual(['γενόμενοι', 'αὐτῷ']);
    expect(greek(46, 27, 'seventy-five souls.')).toEqual(['ἑβδομήκοντα', 'πέντε.']);
    expect(greek(46, 30, 'After this I will gladly die,')).toEqual(['Ἀποθανοῦμαι', 'ἀπὸ', 'τοῦ', 'νῦν,']);
    expect(greek(46, 32, 'they have been feeders of cattle,')).toEqual(['ἄνδρες', 'κτηνοτρόφοι', 'ἦσαν·']);
    expect(greek(46, 33, 'What is you occupation?')).toEqual(['Τί', 'τὸ', 'ἔργον', 'ὑμῶν', 'ἐστίν;']);
    expect(greek(46, 34, 'We your servants are herdsmen')).toEqual(['Ἄνδρες', 'κτηνοτρόφοι', 'ἐσμὲν', 'οἱ', 'παῖδές']);
    expect(greek(46, 34, 'our fathers:')).toEqual(['οἱ', 'πατέρες', 'ἡμῶν·']);
    expect(greek(47, 3, 'What is your occupation?')).toEqual(['Τί', 'τὸ', 'ἔργον', 'ὑμῶν;']);
    expect(greek(47, 4, 'your servants,')).toEqual(['τῶν', 'παίδων', 'σου,']);
    expect(greek(47, 4, 'famine has prevailed')).toEqual(['ἐνίσχυσεν', 'λιμὸς']);
    expect(greek(47, 8, 'How many')).toEqual(['Πόσα']);
    expect(greek(47, 13, 'prevailed greatly;')).toEqual(['ἐνίσχυσεν', 'σφόδρα·']);
    expect(greek(47, 13, 'fainted for')).toEqual(['ἐξέλιπεν']);
    expect(greek(47, 14, 'he distributed corn to them;')).toEqual(['ἐσιτομέτρει', 'αὐτοῖς·']);
    expect(greek(47, 14, 'return for the corn')).toEqual(['τοῦ', 'σίτου']);
    expect(greek(47, 15, 'in your presence?')).toEqual(['ἐναντίον', 'σου;']);
    expect(greek(47, 15, 'is spent.')).toEqual(['ἐκλέλοιπεν']);
    expect(greek(47, 15, 'our money')).toEqual(['τὸ', 'ἀργύριον', 'ἡμῶν.']);
    expect(greek(47, 17, 'in return for')).toEqual(['ἀντὶ']);
    expect(greek(47, 18, 'brought to you')).toEqual(['πρὸς', 'σὲ']);
    expect(greek(47, 19, 'live and not die,')).toEqual(['καὶ', 'μὴ', 'ἀποθάνωμεν,']);
    expect(greek(47, 20, 'sold')).toEqual(['ἀπέδοντο']);
    expect(greek(47, 20, 'land to')).toEqual(['τὴν', 'γῆν', 'τῷ']);
    expect(greek(47, 21, 'he brought the people into bondage')).toEqual(['τὸν', 'λαὸν', 'κατεδουλώσατο']);
    expect(greek(47, 22, 'a portion in the way of gift')).toEqual(['ἐν', 'δόσει', 'δόμα']);
    expect(greek(47, 24, 'remaining parts')).toEqual(['μέρη']);
    expect(greek(47, 26, 'reserve a fifth part')).toEqual(['ἀποπεμπτοῦν,']);
    expect(greek(47, 27, 'they gained an inheritance')).toEqual(['ἐκληρονόμησαν']);
    expect(greek(47, 27, 'and they increased and multiplied')).toEqual(['καὶ', 'ἐπληθύνθησαν']);
    expect(greek(47, 27, 'very greatly.')).toEqual(['σφόδρα.']);
    expect(greek(47, 28, 'seventeen')).toEqual(['δέκα', 'ἑπτά·']);
    expect(greek(47, 28, 'forty-seven')).toEqual(['τεσσεράκοντα', 'ἑπτὰ']);
    expect(greek(47, 28, 'one hundred')).toEqual(['ἑκατὸν']);
    expect(greek(47, 29, 'drew near')).toEqual(['ἤγγισαν']);
    expect(greek(47, 30, 'you shall carry me up')).toEqual(['ἀρεῖς', 'με']);
    expect(greek(47, 31, 'the top of his staff.')).toEqual(['τὸ', 'ἄκρον', 'τῆς', 'ῥάβδου', 'αὐτοῦ.']);
    expect(greek(48, 1, 'it came to pass')).toEqual(['Ἐγένετο']);
    expect(greek(48, 5, 'who were born to you')).toEqual(['οἱ', 'γενόμενοί', 'σοι']);
    expect(greek(48, 6, 'hereafter,')).toEqual(['μετὰ', 'ταῦτα']);
    expect(greek(48, 6, 'after their inheritances.')).toEqual(['ἐπὶ', 'τοῖς', 'ἐκείνων', 'κλήροις.']);
    expect(greek(48, 7, 'drew near')).toEqual(['ἐγγίζοντός']);
    expect(greek(48, 10, 'he brought them near')).toEqual(['ἤγγισεν', 'αὐτοὺς']);
    expect(greek(48, 10, 'he kissed them,')).toEqual(['ἐφίλησεν', 'αὐτοὺς']);
    expect(greek(48, 12, 'brought them out')).toEqual(['ἐξήγαγεν', 'αὐτοὺς']);
    expect(greek(48, 13, 'right hand,')).toEqual(['τῇ', 'δεξιᾷ,']);
    expect(greek(48, 13, 'left hand,')).toEqual(['ἐξ', 'ἀριστερῶν,']);
    expect(greek(48, 13, 'brought them near')).toEqual(['ἤγγισεν', 'αὐτοὺς']);
    expect(greek(48, 14, 'left hand')).toEqual(['τὴν', 'ἀριστερὰν']);
    expect(greek(48, 14, 'guiding his hands crosswise.')).toEqual(['ἐναλλὰξ', 'τὰς', 'χεῖρας.']);
    expect(greek(48, 15, 'were well pleasing,')).toEqual(['εὐηρέστησαν']);
    expect(greek(48, 15, 'who continues to feed')).toEqual(['ὁ', 'τρέφων']);
    expect(greek(48, 17, 'his right hand')).toEqual(['τὴν', 'δεξιὰν', 'αὐτοῦ']);
    expect(greek(48, 19, 'shall be exalted,')).toEqual(['ὑψωθήσεται·']);
    expect(greek(48, 19, 'shall become a')).toEqual(['ἔσται', 'εἰς']);
    expect(greek(48, 22, 'Sicima, a select portion')).toEqual(['σίκιμα', 'ἐξαίρετον']);
  });

  // mw-u2w5klk.349.51's sweep of the aligner's pairs in Genesis 49 to 50: a Greek word the aligner gave to a neighbouring English word, so the word that renders it had no Greek or a neighbour's ('you went up' of 49:4 on
  // the second ἀνέβης alone, 'sons' of 49:8 on a swapped σὲ and σοι, 'they killed' and 'they houghed' of 49:6 on αὐτῶν, 'the foal of his ass' of 49:11 on ἕλικι and the branch's article, 'he blessed' of 49:28 on πατήρ,
  // 'commanded' of 50:2 on παισὶν, 'when' and 'were past,' of 50:4 on each other's word, 'a mourning' and 'they bewailed' of 50:10 on ἐκόψαντο and 'he' on αὐτοῦ, 'therefore he called' of 50:11, 'kindly' and 'to them.' of 50:21).
  // Each is the chunk a fix row gives its own Greek word; 49:1's 'his sons,' and 'them,' are the pairs the Greek of 49:2's English left on αὐτοῖς and ἐπ᾽.
  it('gives the English of Genesis 49 to 50 that the aligner paired to a neighbour its own Greek word: his sons, gather yourselves together, burst not forth, you went up, they killed, your brethren, the foal of his ass, the sinews of their arms, he blessed, commanded, when, they bewailed, therefore he called, kindly', () => {
    const greek = (n: number, v: number, text: string): string[] => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunks = verse.e.filter((c) => c.t === text);
      expect(chunks, `${n}:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse.g[i].t);
    };
    expect(greek(49, 1, 'his sons,')).toEqual(['τοὺς', 'υἱοὺς', 'αὐτοῦ']);
    expect(greek(49, 1, 'them,')).toEqual(['αὐτοῖς']);
    expect(greek(49, 2, 'Gather yourselves together,')).toEqual(['συνάχθητε']);
    expect(greek(49, 2, 'your father.')).toEqual(['τοῦ', 'πατρὸς', 'ὑμῶν.']);
    expect(greek(49, 4, 'burst not forth with violence,')).toEqual(['μὴ', 'ἐκζέσῃς·']);
    expect(greek(49, 4, 'you went up')).toEqual(['ἀνέβης']);
    expect(greek(49, 4, 'of your father;')).toEqual(['τοῦ', 'πατρός', 'σου·']);
    expect(greek(49, 4, 'then you defiled')).toEqual(['τότε', 'ἐμίανας']);
    expect(greek(49, 4, 'you went up.')).toEqual(['ἀνέβης.']);
    expect(greek(49, 6, 'their wrath')).toEqual(['τῷ', 'θυμῷ', 'αὐτῶν']);
    expect(greek(49, 6, 'they killed')).toEqual(['ἀπέκτειναν']);
    expect(greek(49, 6, 'their passion')).toEqual(['τῇ', 'ἐπιθυμίᾳ', 'αὐτῶν']);
    expect(greek(49, 6, 'they houghed')).toEqual(['ἐνευροκόπησαν']);
    expect(greek(49, 7, 'their wrath,')).toEqual(['ὁ', 'θυμὸς', 'αὐτῶν']);
    expect(greek(49, 7, 'for it was willful,')).toEqual(['ὅτι', 'αὐθάδης,']);
    expect(greek(49, 7, 'their anger,')).toEqual(['ἡ', 'μῆνις', 'αὐτῶν']);
    expect(greek(49, 7, 'for it was cruel:')).toEqual(['ὅτι', 'ἐσκληρύνθη·']);
    expect(greek(49, 8, 'your brethren have')).toEqual(['οἱ', 'ἀδελφοί', 'σου·']);
    expect(greek(49, 8, 'praised you,')).toEqual(['σὲ', 'αἰνέσαισαν']);
    expect(greek(49, 8, "your father's")).toEqual(["τοῦ", "πατρός", "σου."]);
    expect(greek(49, 8, 'sons')).toEqual(['οἱ', 'υἱοὶ']);
    expect(greek(49, 8, 'shall do you reverence.')).toEqual(['προσκυνήσουσίν', 'σοι']);
    expect(greek(49, 9, 'you are gone up,')).toEqual(['ἀνέβης·']);
    expect(greek(49, 9, 'stir him up?')).toEqual(['ἐγερεῖ', 'αὐτόν;']);
    expect(greek(49, 10, 'until there come')).toEqual(['ἕως', 'ἂν', 'ἔλθῃ']);
    expect(greek(49, 10, 'the things stored up')).toEqual(['τὰ', 'ἀποκείμενα']);
    expect(greek(49, 11, 'his foal')).toEqual(['τὸν', 'πῶλον', 'αὐτοῦ,']);
    expect(greek(49, 11, 'the foal of his ass')).toEqual(['τὸν', 'πῶλον', 'τῆς', 'ὄνου', 'αὐτοῦ·']);
    expect(greek(49, 11, 'to the branch of it,')).toEqual(['τῇ', 'ἕλικι']);
    expect(greek(49, 11, 'he shall wash')).toEqual(['πλυνεῖ']);
    expect(greek(49, 11, 'his robe')).toEqual(['τὴν', 'στολὴν', 'αὐτοῦ,']);
    expect(greek(49, 11, 'his garment')).toEqual(['τὴν', 'περιβολὴν', 'αὐτοῦ.']);
    expect(greek(49, 14, 'between')).toEqual(['ἀνὰ', 'μέσον']);
    expect(greek(49, 15, 'the resting place')).toEqual(['τὴν', 'ἀνάπαυσιν']);
    expect(greek(49, 15, 'he subjected')).toEqual(['ὑπέθηκεν']);
    expect(greek(49, 15, 'his shoulder')).toEqual(['τὸν', 'ὦμον', 'αὐτοῦ']);
    expect(greek(49, 15, 'to labor,')).toEqual(['εἰς', 'τὸ', 'πονεῖν,']);
    expect(greek(49, 16, 'his people,')).toEqual(['τὸν', 'ἑαυτοῦ', 'λαόν,']);
    expect(greek(49, 17, 'in the way,')).toEqual(['ἐφ᾽', 'ὁδοῦ,']);
    expect(greek(49, 17, 'besetting the path,')).toEqual(['ἐνκαθήμενος', 'ἐπὶ', 'τρίβου·']);
    expect(greek(49, 17, 'backward),')).toEqual(['εἰς', 'τὰ', 'ὀπίσω,']);
    expect(greek(49, 22, 'is a son increased;')).toEqual(['Υἱὸς', 'ηὐξημένος']);
    expect(greek(49, 22, 'my dearly loved son is increased;')).toEqual(['υἱὸς', 'ηὐξημένος', 'μου', 'ζηλωτός·']);
    expect(greek(49, 22, 'my youngest son,')).toEqual(['υἱός', 'μου', 'νεώτατος·']);
    expect(greek(49, 23, 'men taking evil counsel')).toEqual(['διαβουλευόμενοι']);
    expect(greek(49, 23, 'pressed hard upon him.')).toEqual(['ἐνεῖχον', 'αὐτῷ']);
    expect(greek(49, 24, 'But their bow and arrows')).toEqual(['καὶ', 'τὰ', 'τόξα', 'αὐτῶν,']);
    expect(greek(49, 24, 'the sinews of their arms')).toEqual(['τὰ', 'νεῦρα', 'βραχιόνων', 'χειρὸς', 'αὐτῶν,']);
    expect(greek(49, 24, 'were slackened')).toEqual(['ἐξελύθη']);
    expect(greek(49, 24, 'is he that strengthened')).toEqual(['ὁ', 'κατισχύσας']);
    expect(greek(49, 24, 'of your father;')).toEqual(['τοῦ', 'πατρός', 'σου.']);
    expect(greek(49, 25, 'all things,')).toEqual(['πάντα·']);
    expect(greek(49, 26, 'your mother—it')).toEqual(['μητρός', 'σου·']);
    expect(greek(49, 26, 'has prevailed above')).toEqual(['ὑπερίσχυσεν', 'ἐπ᾽']);
    expect(greek(49, 26, 'the blessing')).toEqual(['εὐλογίαις']);
    expect(greek(49, 26, 'of the lasting mountains,')).toEqual(['ὀρέων', 'μονίμων,']);
    expect(greek(49, 27, 'in the morning,')).toEqual(['τὸ', 'πρωινὸν']);
    expect(greek(49, 27, 'at evening')).toEqual(['εἰς', 'τὸ', 'ἑσπέρας']);
    expect(greek(49, 28, 'their father')).toEqual(['ὁ', 'πατὴρ', 'αὐτῶν·']);
    expect(greek(49, 28, 'these words')).toEqual(['ταῦτα']);
    expect(greek(49, 28, 'to them,')).toEqual(['αὐτοῖς']);
    expect(greek(49, 28, 'he blessed them;')).toEqual(['εὐλόγησεν', 'αὐτοὺς', 'ὁ', 'πατήρ,']);
    expect(greek(49, 28, 'he blessed each')).toEqual(['ἕκαστον', 'εὐλόγησεν']);
    expect(greek(49, 28, 'to his blessing.')).toEqual(['τὴν', 'εὐλογίαν', 'αὐτοῦ']);
    expect(greek(49, 33, 'his feet')).toEqual(['τοὺς', 'πόδας', 'αὐτοῦ']);
    expect(greek(49, 33, 'he died,')).toEqual(['ἐξέλιπεν']);
    expect(greek(49, 33, 'to his people.')).toEqual(['πρὸς', 'τὸν', 'λαὸν', 'αὐτοῦ.']);
    expect(greek(50, 2, 'commanded')).toEqual(['προσέταξεν']);
    expect(greek(50, 2, 'servants')).toEqual(['τοῖς', 'παισὶν']);
    expect(greek(50, 3, 'they fulfilled')).toEqual(['ἐπλήρωσεν']);
    expect(greek(50, 3, 'for him,')).toEqual(['αὐτοὺς']);
    expect(greek(50, 4, 'when')).toEqual(['Ἐπειδὴ']);
    expect(greek(50, 4, 'were past,')).toEqual(['παρῆλθον']);
    expect(greek(50, 5, 'adjured me,')).toEqual(['με', 'ὥρκισεν']);
    expect(greek(50, 5, 'which I dug')).toEqual(['ᾧ', 'ὤρυξα']);
    expect(greek(50, 5, 'you shall bury me;')).toEqual(['με', 'θάψεις.']);
    expect(greek(50, 5, 'I will go up')).toEqual(['ἀναβὰς']);
    expect(greek(50, 5, 'my father,')).toEqual(['τὸν', 'πατέρα', 'μου,']);
    expect(greek(50, 6, 'Go up,')).toEqual(['Ἀνάβηθι,']);
    expect(greek(50, 6, 'your father,')).toEqual(['τὸν', 'πατέρα', 'σου']);
    expect(greek(50, 6, 'he constrained you to swear.')).toEqual(['ὥρκισέν', 'σε.']);
    expect(greek(50, 7, 'went up to')).toEqual(['ἀνέβη']);
    expect(greek(50, 7, 'his father;')).toEqual(['τὸν', 'πατέρα', 'αὐτοῦ·']);
    expect(greek(50, 7, 'went up with')).toEqual(['συνανέβησαν', 'μετ᾽']);
    expect(greek(50, 8, 'his kindred;')).toEqual(['ἡ', 'συγγενία', 'αὐτοῦ·']);
    expect(greek(50, 8, 'they left behind')).toEqual(['ὑπελίποντο']);
    expect(greek(50, 9, 'there went up with')).toEqual(['συνανέβησαν', 'μετ᾽']);
    expect(greek(50, 10, 'threshing floor of')).toEqual(['ἅλωνα']);
    expect(greek(50, 10, 'they bewailed')).toEqual(['ἐκόψαντο']);
    expect(greek(50, 10, 'he made')).toEqual(['ἐποίησαν']);
    expect(greek(50, 10, 'a mourning')).toEqual(['τὸ', 'πένθος']);
    expect(greek(50, 10, 'for his father')).toEqual(['τῷ', 'πατρὶ', 'αὐτοῦ']);
    expect(greek(50, 11, 'is a')).toEqual(['ἐστιν']);
    expect(greek(50, 11, 'to the Egyptians;')).toEqual(['τοῖς', 'Αἰγυπτίοις·']);
    expect(greek(50, 11, 'therefore')).toEqual(['διὰ', 'τοῦτο']);
    expect(greek(50, 11, 'he called')).toEqual(['ἐκάλεσεν']);
    expect(greek(50, 11, 'its name,')).toEqual(['τὸ', 'ὄνομα', 'αὐτοῦ']);
    expect(greek(50, 12, 'did to')).toEqual(['ἐποίησαν', 'αὐτῷ']);
    expect(greek(50, 12, 'his sons')).toEqual(['οἱ', 'υἱοὶ', 'αὐτοῦ,']);
    expect(greek(50, 13, 'carried him up')).toEqual(['ἀνέλαβον', 'αὐτὸν']);
    expect(greek(50, 13, 'his sons')).toEqual(['οἱ', 'υἱοὶ', 'αὐτοῦ']);
    expect(greek(50, 14, 'those that had gone up with')).toEqual(['οἱ', 'συναναβάντες']);
    expect(greek(50, 14, 'his father.')).toEqual(['τὸν', 'πατέρα', 'αὐτοῦ.']);
    expect(greek(50, 15, 'lest at any time')).toEqual(['Μή', 'ποτε']);
    expect(greek(50, 15, 'their father')).toEqual(['ὁ', 'πατὴρ', 'αὐτῶν']);
    expect(greek(50, 15, 'they said,')).toEqual(['εἶπαν']);
    expect(greek(50, 15, 'we have done against')).toEqual(['ἐνεδειξάμεθα']);
    expect(greek(50, 15, 'to us')).toEqual(['ἡμῖν']);
    expect(greek(50, 16, 'Your father')).toEqual(['Ὁ', 'πατήρ', 'σου']);
    expect(greek(50, 17, 'say you⌃')).toEqual(['εἴπατε']);
    expect(greek(50, 17, 'their injustice')).toEqual(['τὴν', 'ἀδικίαν']);
    expect(greek(50, 17, 'their sin,')).toEqual(['τὴν', 'ἁμαρτίαν', 'αὐτῶν,']);
    expect(greek(50, 17, 'forasmuch as they')).toEqual(['ὅτι']);
    expect(greek(50, 17, 'have done')).toEqual(['ἐνεδείξαντο·']);
    expect(greek(50, 17, 'of your')).toEqual(['τοῦ', 'σου.']);
    expect(greek(50, 17, 'while they spoke')).toEqual(['λαλούντων', 'αὐτῶν']);
    expect(greek(50, 19, 'I am')).toEqual(['ἐγὼ', 'εἰμί·']);
    expect(greek(50, 19, 'to them,')).toEqual(['αὐτοῖς']);
    expect(greek(50, 19, "God's.")).toEqual(["τοῦ", "θεοῦ"]);
    expect(greek(50, 21, 'he comforted')).toEqual(['παρεκάλεσεν']);
    expect(greek(50, 21, 'kindly')).toEqual(['εἰς', 'τὴν', 'καρδίαν.']);
    expect(greek(50, 21, 'to them.')).toEqual(['αὐτῶν']);
    expect(greek(50, 22, 'one hundred')).toEqual(['ἑκατὸν']);
    expect(greek(50, 24, 'concerning which')).toEqual(['ἣν']);
    expect(greek(50, 25, 'At the visitation')).toEqual(['Ἐν', 'τῇ', 'ἐπισκοπῇ']);
    expect(greek(50, 25, 'with which')).toEqual(['ᾗ']);
    expect(greek(50, 25, 'my bones')).toEqual(['τὰ', 'ὀστᾶ', 'μου']);
    expect(greek(50, 26, 'one hundred')).toEqual(['ἑκατὸν']);
    expect(greek(50, 26, 'they prepared his corpse,')).toEqual(['ἔθαψαν', 'αὐτὸν']);
    expect(greek(50, 26, 'in a coffin')).toEqual(['ἐν', 'τῇ', 'σορῷ']);
  });

  // mw-u2w5klk.349.84 (from .81, found by .47): a function word the aligner gave to a neighbour's Greek word in Genesis 37 to 39: 'his' and 'him' of 37:4 on each other's αὐτοῦ and αὐτὸν, 'I' of 37:16 on μου, 'he' of
  // 38:11 on αὐτῆς, 'he' of 39:3 on αὐτοῦ, and the like in 37:9, 37:14, 37:26, 37:27, 37:32, 38:9, 38:12 to 38:16, 38:20, 38:25, 38:28 to 38:30, 39:4, 39:8, 39:13, 39:15, 39:18 and 39:21 (a 'he', 'she' or 'it' on the αὐτοῦ
  // of the 'his X' after it). Each is the chunk a fix row of gen-37.tsv, gen-38.tsv or gen-39.tsv gives its own Greek word; a no-Greek 'he', 'it' or 'they' reads joined to the chunk after it (joinSupplied), so its row is that chunk's.
  it("gives each function word of Genesis 37 to 39 that sat on a neighbour's Greek word its own: his father and loved him (37:4), I am seeking (37:16), for he said and of her father (38:11), his hands (39:3), and the 'he', 'she' and 'it' of 37:9 to 39:21 that took the αὐτοῦ of the word after", () => {
    const greek = (n: number, v: number, text: string): string[] => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunks = verse.e.filter((c) => c.t === text);
      expect(chunks, `${n}:${v} '${text}' is one chunk`).toHaveLength(1);
      return chunks[0].g.map((i) => verse.g[i].t);
    };
    expect(greek(37, 9, 'he dreamed another dream,')).toEqual(['ἴδεν', 'ἐνύπνιον', 'ἕτερον,']);
    expect(greek(37, 4, 'his father')).toEqual(['ὁ', 'πατὴρ', 'αὐτοῦ']);
    expect(greek(37, 4, 'loved him')).toEqual(['αὐτὸν', 'ἐφίλει']);
    expect(greek(37, 16, 'I am seeking')).toEqual(['ζητῶ·']);
    expect(greek(37, 16, 'my brethren;')).toEqual(['Τοὺς', 'ἀδελφούς', 'μου']);
    expect(greek(37, 9, 'to his father,')).toEqual(['τῷ', 'πατρὶ', 'αὐτοῦ']);
    expect(greek(37, 14, 'to him,')).toEqual(['αὐτῷ']);
    expect(greek(37, 14, 'he sent')).toEqual(['ἀπέστειλεν']);
    expect(greek(37, 26, 'it if')).toEqual(['ἐὰν']);
    expect(greek(37, 26, 'his blood?')).toEqual(['τὸ', 'αἷμα', 'αὐτοῦ;']);
    expect(greek(37, 27, 'he is')).toEqual(['ἐστίν.']);
    expect(greek(37, 27, 'to these Ismaelites,')).toEqual(['τοῖς', 'Ἰσμαηλίταις', 'τούτοις,']);
    expect(greek(37, 32, 'to their father,')).toEqual(['τῷ', 'πατρὶ', 'αὐτῶν,']);
    expect(greek(37, 32, 'if it')).toEqual(['εἰ']);
    expect(greek(38, 25, 'they were bringing')).toEqual(['ἀγομένη']);
    expect(greek(38, 9, 'his—it came to pass')).toEqual(['αὐτῷ', 'ἐγίνετο,']);
    expect(greek(38, 11, 'for he said,')).toEqual(['εἶπεν', 'γάρ']);
    expect(greek(38, 11, 'of her father.')).toEqual(['τοῦ', 'πατρὸς', 'αὐτῆς.']);
    expect(greek(38, 9, 'when he')).toEqual(['ὅταν']);
    expect(greek(38, 9, "seed to his brother's")).toEqual(['σπέρμα', 'τῷ', 'ἀδελφῷ', 'αὐτοῦ.']);
    expect(greek(38, 9, 'he should')).toEqual([]);
    expect(greek(38, 12, 'them')).toEqual([]);
    expect(greek(38, 12, 'his sheep,')).toEqual(['τὰ', 'πρόβατα', 'αὐτοῦ,']);
    expect(greek(38, 12, 'himself')).toEqual(['αὐτὸς']);
    expect(greek(38, 13, 'it')).toEqual([]);
    expect(greek(38, 13, 'his sheep.')).toEqual(['τὰ', 'πρόβατα', 'αὐτοῦ.']);
    expect(greek(38, 15, 'her,')).toEqual(['αὐτὴν']);
    expect(greek(38, 15, 'he thought')).toEqual(['ἔδοξεν']);
    expect(greek(38, 15, 'her face,')).toEqual(['τὸ', 'πρόσωπον', 'αὐτῆς,']);
    expect(greek(38, 15, 'he knew')).toEqual(['ἐπέγνω']);
    expect(greek(38, 16, 'she was')).toEqual(['ἐστίν.']);
    expect(greek(38, 16, 'his daughter-in-law;')).toEqual(['ἡ', 'νύμφη', 'αὐτοῦ']);
    expect(greek(38, 20, 'of his shepherd')).toEqual(['τοῦ', 'ποιμένος', 'αὐτοῦ']);
    expect(greek(38, 20, 'he found')).toEqual(['εὗρεν']);
    expect(greek(38, 25, 'she sent')).toEqual(['αὐτὴ', 'ἀπέστειλεν']);
    expect(greek(38, 28, 'it, bound')).toEqual(['ἔδησεν']);
    expect(greek(38, 28, 'his hand')).toEqual(['τὴν', 'χεῖρα', 'αὐτοῦ']);
    expect(greek(38, 29, 'he drew back')).toEqual(['ἐπισυνήγαγεν']);
    expect(greek(38, 29, 'his name,')).toEqual(['τὸ', 'ὄνομα', 'αὐτοῦ']);
    expect(greek(38, 29, 'his brother;')).toEqual(['ὁ', 'ἀδελφὸς', 'αὐτοῦ.']);
    expect(greek(38, 29, 'she said,')).toEqual(['εἶπεν']);
    expect(greek(38, 30, 'whose hand')).toEqual(['ᾧ', 'χεῖρα', 'αὐτοῦ']);
    expect(greek(38, 30, 'she called')).toEqual(['ἐκάλεσεν']);
    expect(greek(39, 3, 'he happens to do.')).toEqual(['ποιῇ,']);
    expect(greek(39, 3, 'his hands')).toEqual(['ταῖς', 'χερσὶν', 'αὐτοῦ.']);
    expect(greek(39, 4, 'his house,')).toEqual(['τοῦ', 'οἴκου', 'αὐτοῦ,']);
    expect(greek(39, 4, 'he had')).toEqual(['ἦν', 'αὐτῷ']);
    expect(greek(39, 4, 'he gave')).toEqual(['ἔδωκεν']);
    expect(greek(39, 8, 'his house,')).toEqual(['τῷ', 'οἴκῳ', 'αὐτοῦ,']);
    expect(greek(39, 8, 'he would')).toEqual(['ἤθελεν,']);
    expect(greek(39, 13, 'his clothes')).toEqual(['τὰ', 'ἱμάτια', 'αὐτοῦ']);
    expect(greek(39, 13, 'he had left')).toEqual(['κατέλειπεν']);
    expect(greek(39, 15, 'his clothes')).toEqual(['τὰ', 'ἱμάτια', 'αὐτοῦ']);
    expect(greek(39, 15, 'he fled,')).toEqual(['ἔφυγεν']);
    expect(greek(39, 18, 'his clothes')).toEqual(['τὰ', 'ἱμάτια', 'αὐτοῦ']);
    expect(greek(39, 18, 'he fled')).toEqual(['ἔφυγεν']);
    expect(greek(39, 21, 'upon him;')).toEqual(['αὐτοῦ']);
    expect(greek(39, 21, 'he gave')).toEqual(['ἔδωκεν']);
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
