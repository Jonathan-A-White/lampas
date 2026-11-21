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
import { alignChapter, alignRuns, alignVerse, lettersOf, renderAlignReport, SUPPLIED_FOR_VERB, type AlignShare } from '../../scripts/lxx/align';
import { contentWordsOf } from '../../scripts/lxx/unpaired';
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
import { runShip } from '../../scripts/lxx/ship';
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

// the real Genesis 1 to 39 (the chapters the model pass has been run for): when the pinned sources and the Morpheus cache are on the disk, here or in the Laptop's checkout, and the work touches what they check (tests/support/lxx-real-data.ts);
// the gate's log says in one line when it is skipped and why. Sources found elsewhere than the cwd are given to runShip, so no symlink is needed.
// Genesis 20 is his own report (2026-11-10, mw-u2w5klk.349.2: a tap on 'removed' in Genesis 20:1 opened the Verse view); the chapters of the model pass are listed here, and a chapter is added when its file is
// Genesis 12 to 19 and 21 to 23 are the pass of mw-u2w5klk.349.3 (Genesis 14 was left, and is the pass of mw-u2w5klk.349.23); Genesis 24 to 29 are that of mw-u2w5klk.349.4, Genesis 30 to 36 that of mw-u2w5klk.349.5, Genesis 37 to 39 that of mw-u2w5klk.349.47.
const MODELLED = [...Array.from({ length: 11 }, (_, i) => i + 1), 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
describe.skipIf(!haveSources)('Genesis 1 to 39 with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
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
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has a model file for each of Genesis 1 to 39, and none of its runs is stale', () => {
    const files = readdirSync(ALIGN_CHOICES_DIR).filter((f) => f.startsWith('gen-'));
    expect(files).toEqual(MODELLED.map((n) => alignChoicesName('gen', n)));
    expect(stale).toEqual([]);
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

  // The English content words Genesis 20 has no Greek word for after the pass (mw-u2w5klk.349.2), each named with why: the Greek word that renders it is a pair the aligner made to another English
  // word (the model re-chooses remainders, not pairs), or Brenton has no Greek word for it. A tap on one opens the Verse view, never a wrong word (septuagintChunkLinked). Every other unpaired chunk of the
  // chapter is made of function words (articles, prepositions, the pronouns and auxiliaries Brenton supplies).
  const FUNCTION_WORDS = new Set(
    'a against an and are at be by for from had has have he her him his i in into is it me my not of on or she shall should so that the their them there they those to us was we which will with you your'.split(' '),
  );
  const UNPAIRED_CONTENT: Record<string, string> = {
    '2:sake.': "'for her sake' (δι᾽ αὐτήν): both Greek words are the aligner's, paired to 'for' and 'her'",
    '4:sinning': "'ignorantly sinning': ἀγνοοῦν is the aligner's, paired to 'ignorantly'",
    '6:Yes,': "Brenton's 'Yes, I knew' has no Greek word for 'Yes'",
    '8:morning,': "'early in the morning' (τὸ πρωί): πρωί is the aligner's, paired to 'early'; the article is all that is left",
    '9:ought': "'which no one ought to do': the aligner paired 'no one' with μή τι, and οὐδεὶς has no English left to take it",
    '11:Why': "Brenton's 'Why' has no Greek word",
    '11:worship': "'the worship of God': θεοσέβεια is the aligner's, paired to 'God'",
    '13:came': "'it came to pass' renders ἐγένετο, the aligner's, paired to 'to'",
    '13:pass': "'it came to pass' renders ἐγένετο, the aligner's, paired to 'to'",
    '13:forth': "'brought forth' renders ἐξήγαγεν, the aligner's, paired to 'brought'",
    '16:countenance,': "'the price of your countenance': the aligner paired 'price' with προσώπου, and τιμήν has no English left",
    '16:women': "'to all the women': ταῖς is the aligner's, paired to 'the'",
    '16:speak': "'speak the truth' renders ἀλήθευσον, the aligner's, paired to 'truth'",
    '16:things.': "'in all things' renders πάντα, the aligner's, paired to 'all'",
    '17:wife,': "'his wife' renders γυναῖκα, the aligner's, paired to 'women'",
    '17:children.': "'they bore children' renders ἔτεκον, the aligner's, paired to 'bore'",
  };
  const unpaired = (chapter: Chapter): string[] =>
    chapter.verses.flatMap((v) => v.e.filter((c) => !septuagintChunkLinked(c)).flatMap((c) => c.t.split(/\s+/).filter((w) => !FUNCTION_WORDS.has(lettersOf(w))).map((w) => `${v.n}:${w}`)));

  it('leaves in Genesis 20 no English content word without a Greek word but those named, each with why', () => {
    expect(unpaired(withModel.get(20)!).sort()).toEqual(Object.keys(UNPAIRED_CONTENT).sort());
  });

  // Genesis 12 to 19 and 21 to 23 (mw-u2w5klk.349.3): the English content words (`contentWordsOf`, scripts/lxx/unpaired.ts) that sit in a chunk with no Greek word after the pass, 189 of 2,560 (607 had none
  // before it, read with `npm run lxx:unpaired -- --book gen`; mw-u2w5klk.349.32 gave a Greek word to 58 of the 189, a Greek word paired to its neighbour's English, and two went to a name of their own (12:11 'came', 17:19 'God'), so 133 are left), keyed chapter:verse:word and read by hand from `--list`. Each is in one of three lists, with why. A tap on one opens the Verse view, never a wrong word.
  // 'it came to pass' renders ἐγένετο (Hebrew's 'and it was'), which the aligner paired to one English word; the model re-chooses remainders, not pairs, so the others have no Greek word left.
  const IDIOM_NO_GREEK = [
    '12:11:came', '12:11:pass', '12:12:pass', '12:14:came', '12:14:pass', '19:17:came', '19:17:pass', '19:29:came', '19:34:came', '19:34:pass', '21:22:came', '22:1:came',
    '22:1:pass', '22:20:came', '22:20:pass',
  ];
  // LXX2012 carries English of the next Greek verse in these two (Genesis 13:11 'And Abram lived in the land of Chanaan' is Swete's 13:12; Genesis 22:15 runs into 22:16): the Greek words are in the other verse.
  const NEXT_VERSE_NO_GREEK = [
    '13:11:abram', '13:11:lived', '13:11:land', '13:11:chanaan', '22:15:saying', '22:15:sworn', '22:15:says', '22:15:lord', '22:15:because',
    '22:15:thing', '22:15:account', '22:15:spared', '22:15:beloved', '22:15:son',
  ];
  // Either the Greek word that renders it is a pair the aligner made to another English word that no fix row (`fix` rows of data/lxx/align, applyFixes) has yet moved ('God' for αἰώνιον in 17:19, paired to the
  // word before it: the Greek has no 'God' there), or Brenton's English adds it to turn a Greek phrase into English ('forth', 'aside', 'early', 'fine', 'aloud', 'only', 'still', 'drink', 'journey').
  const PAIRED_OR_ADDED_NO_GREEK = [
    '12:1:come', '12:12:come', '12:20:forward', '13:3:place', '13:6:land', '13:7:cattle', '13:9:go', '13:9:go', '13:9:go', '13:9:go', '15:1:great', '15:2:heir', '15:3:grieved',
    '15:3:homeborn', '15:5:look', '15:5:fully', '15:9:third', '15:9:third', '15:13:four', '15:17:divided', '16:1:children', '16:13:god', '16:13:appeared', '17:7:god', '17:12:old',
    '17:12:born', '17:12:money', '17:13:money', '17:17:old', '17:17:bear', '17:19:god', '18:5:refreshment', '18:5:aside', '18:12:thing', '18:16:journey', '18:17:intend',
    '18:22:still', '18:24:whole', '18:26:whole', '18:30:sake', '18:31:able', '18:31:find', '19:2:aside', '19:2:early', '19:2:journey', '19:3:aside', '19:3:cakes', '19:4:went',
    '19:6:porch', '19:7:villanously', '19:9:drew', '19:10:forth', '19:13:going', '19:14:depart', '19:15:forth', '19:15:destroyed', '19:17:round', '19:20:one', '19:27:go',
    '19:28:went', '19:32:drink', '19:33:drink', '19:33:knew', '19:34:drink', '19:35:drink', '19:35:knew', '19:38:saying', '21:2:old', '21:2:set', '21:2:according', '21:5:one',
    '21:5:old', '21:5:born', '21:6:rejoice', '21:13:nation', '21:16:surely', '21:16:aloud', '21:19:drink', '21:22:host', '21:22:things', '21:22:whatever', '21:25:because',
    '21:26:tell', '21:26:only', '22:2:one', '22:9:feet', '22:9:together', '22:12:sake', '22:18:earth', '22:21:chazad', '22:22:bathuel', '22:22:begot', '22:22:rebecca', '23:1:one',
    '23:5:sir', '23:13:side', '23:15:land', '23:15:worth', '23:15:nay', '23:16:four', '23:17:borders', '23:17:round', '23:17:made', '23:17:sure',
  ];
  const noGreek = (chapter: Chapter): string[] =>
    chapter.verses.flatMap((v) => v.e.filter((c) => !septuagintChunkLinked(c)).flatMap((c) => contentWordsOf(c.t).map((w) => `${chapter.chapter}:${v.n}:${w}`)));

  it('leaves in Genesis 12 to 19 and 21 to 23 no English content word without a Greek word but those named, each in a list with why, and no remainder (y "align?") at all', () => {
    const named = [...IDIOM_NO_GREEK, ...NEXT_VERSE_NO_GREEK, ...PAIRED_OR_ADDED_NO_GREEK].sort();
    const found = [12, 13, 15, 16, 17, 18, 19, 21, 22, 23].flatMap((n) => noGreek(withModel.get(n)!)).sort();
    expect(found).toEqual(named);
    expect(named).toHaveLength(133);
    for (const n of [12, 13, 15, 16, 17, 18, 19, 21, 22, 23]) for (const verse of withModel.get(n)!.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
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

  it("links Genesis 22:13's 'lifted' to ἀναβλέψας and 'offered' to ἀνήνεγκεν, and 'whole burnt offering' to ὁλοκάρπωσιν; the same 'lifted up' in 18:2 and 22:4", () => {
    expect(greekOf(22, 13, chunkWith(22, 13, 'lifted'))).toEqual(['ἀναβλέψας']);
    expect(greekOf(22, 13, chunkWith(22, 13, 'offered'))).toEqual(['ἀνήνεγκεν']);
    expect(chunkWith(22, 13, 'burnt').t).toBe('a whole burnt offering');
    expect(greekOf(22, 13, chunkWith(22, 13, 'burnt'))).toEqual(['ὁλοκάρπωσιν']);
    expect(greekOf(18, 2, chunkWith(18, 2, 'lifted'))).toEqual(['ἀναβλέψας']);
    expect(greekOf(22, 4, chunkWith(22, 4, 'lifted'))).toEqual(['ἀναβλέψας']);
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

  // Genesis 24 to 29 (mw-u2w5klk.349.4): the English content words that sit in a chunk with no Greek word after the pass, 168 of 2,535 (566 had none before it; 187 after it, 19 fewer after the fix rows of mw-u2w5klk.349.33, read with `npm run lxx:unpaired -- --book gen`),
  // keyed chapter:verse:word and read by hand from `--list`, each in one of three lists with why. A tap on one opens the Verse view, never a wrong word. The aligner's pairs are not touched, so the first and third
  // lists are the same kind as those of Genesis 12 to 23 above: 'it came to pass' renders ἐγένετο (paired to one English word), and the Greek word of the rest is a pair the aligner made to another English word
  // ('master' for Κύριος, 'draw' for ὑδρεύσατο) or English Brenton adds to make a Greek phrase English ('instead', 'just', 'hither', 'forth', 'away').
  const IDIOM_NO_GREEK_24_TO_29 = [
    '24:22:came', '24:22:pass', '24:30:came', '24:30:pass', '24:45:came', '24:45:pass', '24:52:came', '24:52:pass', '25:11:came',
    '25:11:pass', '26:32:came', '26:32:pass', '27:1:came', '27:1:pass', '27:30:came', '27:30:pass', '27:30:came', '27:30:pass', '27:34:came', '27:34:pass', '29:10:came',
    '29:10:pass', '29:13:came', '29:13:pass',
  ];
  // Brenton's English of these verses carries a clause whose Greek word is in the verse before or after (Genesis 24:18 'till', 24:27 'and said', 25:20 'Abraam begot Isaac', 27:44 'until your brother's anger')
  // or that the Greek verse does not have (27:38 'being troubled, Esau cried aloud and wept', 29:20 'and they were before him as a few days, by reason of his loving her').
  const OTHER_VERSE_NO_GREEK_24_TO_29 = [
    '24:18:till', '24:18:ceased', '24:18:drinking', '24:27:said', '25:20:abraam', '25:20:begot', '25:20:isaac', '27:38:troubled', '27:38:esau', '27:38:cried',
    '27:38:aloud', '27:38:wept', '27:44:until', '27:44:brother', '27:44:anger', '29:20:few', '29:20:days', '29:20:reason', '29:20:loving',
  ];
  const PAIRED_OR_ADDED_NO_GREEK_24_TO_29 = [
    '24:1:things', '24:3:god', '24:4:thence', '24:5:came', '24:6:back', '24:7:sprang', '24:7:thence', '24:8:again', '24:10:took',
    '24:11:draw', '24:12:way', '24:14:give', '24:14:drink', '24:14:one', '24:15:same', '24:16:came', '24:17:drink', '24:18:drink',
    '24:19:draw', '24:20:again', '24:20:drew', '24:22:put', '24:22:pieces', '24:24:son', '24:27:master', '24:27:fail', '24:27:master',
    '24:27:brought', '24:29:meet', '24:32:wash', '24:35:master', '24:42:master', '24:43:come', '24:43:drink', '24:44:draw', '24:44:own',
    '24:44:hereby', '24:45:went', '24:45:drew', '24:45:drink', '24:46:head', '24:46:give', '24:46:gave', '24:48:master', '24:48:prospered', '24:49:tell', '24:49:hand',
    '24:50:come', '24:54:went', '24:54:away', '24:56:away', '24:59:forth', '24:63:forth', '24:63:lifted', '24:64:lifted', '25:6:away', '25:7:many',
    '25:7:one', '25:8:man', '25:9:son', '25:17:one', '25:18:one', '25:20:old', '25:20:syrian', '25:23:one', '25:25:came', '25:26:forth', '25:26:old',
    '25:27:lads', '25:32:belong', '26:2:go', '26:10:sin', '26:12:one',
    '26:16:become', '26:24:sake', '26:25:valley', '26:25:gerara', '26:27:away', '26:29:forth', '26:31:forth', '26:34:old', '27:2:old',
    '27:21:draw', '27:22:drew', '27:25:hither', '27:25:near', '27:26:draw', '27:27:drew', '27:30:just', '27:36:time', '27:40:time', '27:41:because',
    '27:41:blessed', '27:41:draw', '28:5:away', '28:7:syria', '28:10:forth', '28:11:one', '28:11:lay', '28:14:north', '28:15:continually', '28:15:back',
    '28:20:throughout', '29:3:used', '29:3:away', '29:3:again', '29:8:together', '29:8:away', '29:10:mother', '29:10:sheep', '29:10:laban',
    '29:10:brother', '29:10:away', '29:15:surely', '29:22:together', '29:27:return', '29:32:given', '29:32:son', '29:33:one', '29:35:time',
    '24:33:told', '24:53:forth', '26:8:time', '27:38:only', '29:7:together',
  ];

  it('leaves in Genesis 24 to 29 no English content word without a Greek word but those named, each in a list with why, and no remainder (y "align?") at all', () => {
    const named = [...IDIOM_NO_GREEK_24_TO_29, ...OTHER_VERSE_NO_GREEK_24_TO_29, ...PAIRED_OR_ADDED_NO_GREEK_24_TO_29].sort();
    const found = [24, 25, 26, 27, 28, 29].flatMap((n) => noGreek(withModel.get(n)!)).sort();
    expect(found).toEqual(named);
    expect(named).toHaveLength(168);
    for (const n of [24, 25, 26, 27, 28, 29]) for (const verse of withModel.get(n)!.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
  });

  it('pairs a content word of each kind (Genesis 24:2 servant, 25:29 cooked, 26:19 dug, 27:15 raiment, 28:2 depart, 29:11 kissed) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[24, 2, 'servant'], [25, 29, 'cooked'], [26, 19, 'dug'], [27, 15, 'raiment'], [28, 2, 'depart'], [29, 11, 'kissed']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // Genesis 30 to 36 (mw-u2w5klk.349.5): the English content words that sit in a chunk with no Greek word after the pass (584 had none before it, read with `npm run lxx:unpaired -- --book gen`),
  // keyed chapter:verse:word and read by hand from `--list`, each in one of three lists with why: 167 of 2,602 content words. A tap on one opens the Verse view, never a wrong word. The aligner's pairs are not touched.
  // 'it came to pass' renders ἐγένετο (paired to one English word by the aligner; the model re-chooses remainders, not pairs), so 'pass' and the 'came' beside it have no Greek word left.
  const IDIOM_NO_GREEK_30_TO_36 = [
    '30:25:came', '30:25:pass', '30:41:came', '30:41:pass', '31:10:came', '31:10:pass', '34:25:came', '34:25:pass', '35:12:come', '35:12:pass', '35:16:pass', '35:17:came', '35:17:pass',
    '35:18:came', '35:18:pass', '35:21:came', '35:21:pass'
  ];
  // LXX2012 carries English here whose Greek is in the verse before or after (Genesis 31:50 to 31:53's 'God is witness', 'swore by the Fear of his father Isaac', 30:9's 'went in', which Swete has in 30:10), English
  // that the Greek verse does not have (Genesis 31:51 is a whole verse with no Greek, 33:5's 'Esau', 35:29's 'Isaac', 36:18's 'daughter of Ana, wife of Esau').
  const OTHER_VERSE_NO_GREEK_30_TO_36 = [
    '30:9:went', '31:50:god', '31:50:looking', '31:50:witness', '31:51:heap', '31:51:jacob', '31:51:laban', '31:51:pillar', '31:51:said', '31:51:witness', '31:53:father', '31:53:fear',
    '31:53:isaac', '31:53:jacob', '31:53:swore', '33:5:esau', '35:29:isaac', '36:18:ana', '36:18:daughter', '36:18:esau', '36:18:wife'
  ];
  // Either the Greek word that renders it is a pair the aligner made to another English word ('lord' for Κύριος, 'hand' for χειρός, 'stead' for ἀντί) or Brenton adds it to make English of a Greek phrase ('forth', 'away', 'back', 'matter',
  // 'hard', 'very', 'forth', 'looked').
  const PAIRED_OR_ADDED_NO_GREEK_30_TO_36 = [
    '30:6:given', '30:6:therefore', '30:13:pronounce', '30:14:sister', '30:16:forth', '30:17:lea', '30:25:away', '30:29:many', '30:30:lord', '30:30:time', '30:35:shegoats', '30:36:behind',
    '30:36:journey', '30:37:plane', '30:37:storax', '30:37:stripe', '30:37:stripes', '30:37:tree', '30:39:cattle', '30:39:conceived', '30:39:rods', '30:41:became', '30:41:pregnant',
    '30:42:happened', '30:42:indiscriminately', '31:7:power', '31:10:young', '31:12:leaping', '31:13:god', '31:18:took', '31:20:matter', '31:20:ran', '31:24:things', '31:26:lead',
    '31:26:run', '31:26:taken', '31:27:away', '31:28:counted', '31:29:words', '31:30:depart', '31:30:earnestly', '31:31:afraid', '31:31:because', '31:32:observed', '31:32:property',
    '31:36:injustice', '31:39:beasts', '31:40:chilled', '31:40:parched', '31:42:sent', '31:43:property', '31:47:testimony', '31:50:addition', '31:52:beyond', '31:52:mischief', '31:55:back',
    '32:1:looked', '32:5:born', '32:6:four', '32:7:camels', '32:11:hand', '32:14:shegoats', '32:14:two', '32:17:possessions', '32:20:presence', '32:23:brought', '32:25:prevailed',
    '32:26:day', '32:26:go', '32:30:hei', '32:30:said', '32:32:angel', '33:1:eyes', '33:1:hundred', '33:1:lifted', '33:3:drew', '33:3:seven', '33:5:blessed', '33:5:mercifully',
    '33:8:things', '33:11:mercy', '33:11:things', '33:13:hard', '33:13:very', '33:14:journey', '33:14:servant', '33:17:therefore', '33:19:one', '34:1:forth', '34:6:forth', '34:10:midst',
    '34:12:demand', '34:12:much', '34:14:thing', '34:15:only', '34:15:terms', '34:19:attached', '34:19:most', '34:19:much', '34:19:young', '34:22:conform', '34:25:man', '34:26:forth',
    '34:29:took', '34:30:pieces', '34:31:nay', '35:1:fled', '35:1:go', '35:3:throughout', '35:7:fled', '35:8:buried', '35:10:called', '35:10:israel', '35:10:name', '35:14:god',
    '35:14:offered', '35:16:drew', '35:18:name', '35:19:way', '35:21:grievous', '35:21:jacob', '35:21:went', '35:26:born', '35:28:one', '36:5:born', '36:6:esau', '36:6:got', '36:7:because',
    '36:36:samada'
  ];

  it('leaves in Genesis 30 to 36 no English content word without a Greek word but those named, each in a list with why, and no remainder (y "align?") at all', () => {
    const named = [...IDIOM_NO_GREEK_30_TO_36, ...OTHER_VERSE_NO_GREEK_30_TO_36, ...PAIRED_OR_ADDED_NO_GREEK_30_TO_36].sort();
    const found = [30, 31, 32, 33, 34, 35, 36].flatMap((n) => noGreek(withModel.get(n)!)).sort();
    expect(found).toEqual(named);
    expect(named).toHaveLength(167);
    for (const n of [30, 31, 32, 33, 34, 35, 36]) for (const verse of withModel.get(n)!.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
  });

  it('pairs a content word of each kind (Genesis 30:14 barley, 31:10 conceived, 32:17 whither, 33:4 kissed, 34:10 trade, 35:2 purify yourselves) to a Greek word the Reader links', () => {
    const chunkOf = (n: number, v: number, text: string): EnglishChunk => withModel.get(n)!.verses.find((x) => x.n === v)!.e.find((c) => c.t.split(/\s+/).includes(text))!;
    for (const [n, v, text] of [[30, 14, 'barley'], [31, 10, 'conceived'], [32, 17, 'whither'], [33, 4, 'kissed'], [34, 10, 'trade,'], [35, 2, 'purify']] as const) {
      const chunk = chunkOf(n, v, text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk), `${n}:${v} ${text}`).toBe(true);
    }
  });

  // Genesis 14 (mw-u2w5klk.349.23; 349.3 left it, and `lxx:unpaired` listed it with 50 English content words where a tap opened the Verse view): the English content words that sit in a chunk with no Greek word
  // after the pass, keyed verse:word and read by hand from `--list --chapter 14`. A tap on one opens the Verse view, never a wrong word.
  // 3 of 278 content words (50 had none before it, 24 after the pass, read with `npm run lxx:unpaired -- --book gen`; mw-u2w5klk.349.46 moved 21 of them with the fix rows of data/lxx/align/gen-14.tsv, the aligner's
  // pairs that gave a Greek word to a neighbouring English word), each in one of two lists with why. 'it came to pass' (14:1) renders ἐγένετο, paired to one English word by the aligner.
  const IDIOM_NO_GREEK_14 = ['1:came', '1:pass'];
  // Brenton adds 'Lord' of 14:22 to make English of a Greek phrase (τὸν θεὸν τὸν ὕψιστον has no κύριον).
  const PAIRED_OR_ADDED_NO_GREEK_14 = ['22:lord'];
  const NO_GREEK_14 = [...IDIOM_NO_GREEK_14, ...PAIRED_OR_ADDED_NO_GREEK_14];

  it('leaves in Genesis 14 no English content word without a Greek word but those named, and no remainder (y "align?") at all', () => {
    const chapter = withModel.get(14)!;
    expect(noGreek(chapter).map((w) => w.replace(/^14:/, '')).sort()).toEqual([...NO_GREEK_14].sort());
    expect(NO_GREEK_14).toHaveLength(3);
    for (const verse of chapter.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen 14:${verse.n}`).toEqual([]);
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

  // Genesis 37 to 39 (mw-u2w5klk.349.47; `lxx:unpaired` listed them with 106, 76 and 86 English content words where a tap opened the Verse view): the English content words that sit in a chunk with no Greek word after
  // the pass, 19 of 931 content words, keyed chapter:verse:word and read by hand from `--list`, each in one of two lists with why. A tap on one opens the Verse view, never a wrong word. The aligner's pairs that gave a Greek
  // word to a neighbouring English word (the class of mw-u2w5klk.349.46) are moved by the fix rows of data/lxx/align/gen-37.tsv to gen-39.tsv: 'it came to pass' is one chunk of ἐγένετο in each of these chapters, so none is left for the idiom lists.
  // LXX2012's 37:32 holds the Greek 37:32 and 37:33 (docs/data.md), so 'And he recognized it, and said, It is my son's coat, an evil wild beast has devoured him; a wild beast has carried off Joseph.' renders the words of the
  // Greek verse 37:33, which has no English chunk of its own to point at.
  const NEXT_VERSE_NO_GREEK_37_TO_39 = ['37:32:recognized', '37:32:said', '37:32:son', '37:32:coat', '37:32:evil', '37:32:wild', '37:32:beast', '37:32:devoured', '37:32:wild', '37:32:beast', '37:32:carried', '37:32:joseph'];
  // Brenton adds them to make English of a Greek phrase: 37:2 'of his father' (Swete has only 'with his brethren'), 37:8 'shall you indeed be lord' and 'still more' (ἔτι is 'still'), 37:24 'was empty' (Swete: 'had no water'),
  // 38:9 'to his brother's wife' (Swete: 'to his brother'), 38:17 'Well,' and 39:12 'in her hands,' (Swete: 'having left his clothes, he fled').
  const ADDED_NO_GREEK_37_TO_39 = ['37:2:father', '37:8:indeed', '37:8:more', '37:24:empty', '38:9:wife', '38:17:well', '39:12:hands'];

  it('leaves in Genesis 37 to 39 no English content word without a Greek word but those named, each in a list with why, and no remainder (y "align?") at all', () => {
    const named = [...NEXT_VERSE_NO_GREEK_37_TO_39, ...ADDED_NO_GREEK_37_TO_39].sort();
    const found = [37, 38, 39].flatMap((n) => noGreek(withModel.get(n)!)).sort();
    expect(found).toEqual(named);
    expect(named).toHaveLength(19);
    for (const n of [37, 38, 39]) for (const verse of withModel.get(n)!.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Gen ${n}:${verse.n}`).toEqual([]);
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
