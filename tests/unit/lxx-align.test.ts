// tests/unit/lxx-align.test.ts — `npm run lxx:align` (scripts/lxx/align.ts, mw-u2w5klk.274.1; docs/lxx-align.md): Brenton's verse cut into English chunks aligned to Swete's Greek words,
// deterministically (a lemma's gloss from the lexicon, a name by its transliteration, a function word by its place), written into each shipped verse's `e` with a confidence `c` and a source `y`.
// The Genesis 1 fixture is the one tests/unit/data-build-lxx.test.ts builds (tests/fixtures/lxx: Swete's Gen 1, the annotations, TBESG's rows for its lemmas), with all 31 verses of LXX2012's Gen 1 (lxx2012-gen-1-full.usfm; the other file holds five).
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { syntheticGenesis } from '../support/lxx-genesis';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';
import { buildLxx, LEXICON_FILE, type LxxInput, type LxxLexiconEntry } from '../../scripts/data-build-lxx';
import {
  ALIGN_END, ALIGN_START, alignChapter, alignVerse, renderAlignReport, runAlign, type AlignShare, type AlignSink,
} from '../../scripts/lxx/align';
import { deriveBook, type DeriveInput } from '../../scripts/lxx/derive';
import type { KnownScore } from '../../scripts/lxx/known';
import { runShip, type ShipOptions } from '../../scripts/lxx/ship';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');
const [genVersification, genWords] = fixture('swete-gen-1.csv').split('\n\n');

const input = (over: Partial<LxxInput> = {}): LxxInput => ({
  versification: genVersification,
  words: genWords,
  translit: fixture('swete-translit-gen-1.csv'),
  annotations: { gen: fixture('annotations-gen-1.tsv') },
  usfm: { gen: fixture('lxx2012-gen-1-full.usfm') },
  tvtms: fixture('tvtms-slice.txt'),
  tbesg: fixture('tbesg-gen-1.txt'),
  licence: readFileSync(join(FIXTURES, 'LICENSE-LXX-Swete-1930')),
  readme: readFileSync(join(FIXTURES, 'README-LXX-Swete-1930.md')),
  ...over,
});

const plain = buildLxx(input());
const sink: AlignSink = { shares: [] };
const aligned = buildLxx(input(), sink);
const chapterOf = (files: Map<string, string>, path: string): Chapter => JSON.parse(files.get(path) ?? 'null') as Chapter;
const gen1Plain = chapterOf(plain.files, 'gen/1.json');
const gen1 = chapterOf(aligned.files, 'gen/1.json');
const lexicon = JSON.parse(aligned.files.get(LEXICON_FILE) ?? '{}') as Record<string, LxxLexiconEntry>;
const gloss = (lemma: string): string => lexicon[lemma]?.g ?? '';

/** The share of Genesis 1's Greek words the aligner pairs, set from a dry run on this fixture (mw-u2w5klk.274.1): it measured 0.8389 (the words with an English chunk, 630 of 751; the 121 left are mostly Greek articles Brenton has no 'the' for); the floor is the dry run rounded down. */
const GEN1_SHARE_FLOOR = 0.83;

const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const verseOf = (text: string, g: GreekWord[], s?: number[]): Verse => ({ n: 1, g, e: [{ t: text, g: g.map((_, i) => i), ...(s ? { s } : {}) }] });
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the aligned chapter keeps the shape the weave reads', () => {
  it('without an aligner the build is as it was: one chunk a verse holding every word', () => {
    expect(gen1Plain.verses[0].e).toEqual([{ t: 'In the beginning God made the heaven and the earth.', g: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }]);
  });

  it('cuts Gen 1:1 into chunks with t, g, a confidence c and the source y "align", and points each paired word at its chunk', () => {
    const verse = gen1.verses[0];
    expect(verse.e.map((c) => c.t)).toEqual(['In', 'the', 'beginning', 'God', 'made', 'the', 'heaven', 'and', 'the', 'earth.']);
    // the 'the' before 'beginning' has no Greek article: it is a remainder, for the model pass; every other chunk is aligned
    for (const chunk of verse.e) {
      if (chunk.y === 'align?') {
        expect(chunk).toEqual({ t: 'the', g: [], y: 'align?' });
        continue;
      }
      expect(chunk.y).toBe('align');
      expect(chunk.c).toBeGreaterThan(0);
      expect(chunk.c).toBeLessThanOrEqual(1);
      expect(Math.round((chunk.c ?? 0) * 100) / 100).toBe(chunk.c);
    }
    // ἐν ἀρχῇ: in, beginning; θεός: God; ποιέω: made (an irregular past); the Greek articles stand beside the English ones
    const at = (t: string): number => verse.e.findIndex((c) => c.t === t);
    expect(verse.e[at('In')].g).toEqual([0]);
    expect(verse.e[at('beginning')].g).toEqual([1]);
    expect(verse.e[at('made')].g).toEqual([2]);
    expect(verse.e[at('God')].g).toEqual([4]);
    expect(verse.e[at('earth.')].g).toEqual([9]);
    verse.e.forEach((chunk, i) => chunk.g.forEach((g) => expect(verse.g[g].e).toBe(i)));
  });

  it('is read by weaveVerse: over an aligned Gen 1 verse it returns one entry a chunk, in the chunks\' order, and weaves the chunk of a known word', () => {
    const verse = gen1.verses[0];
    const woven = weaveVerse(verse, { solid: new Set(['θεός']) });
    expect(woven).toHaveLength(verse.e.length);
    const god = verse.e.findIndex((c) => c.t === 'God');
    expect(woven[god]?.words.map((w) => w.t)).toEqual(['θεὸς']);
    woven.forEach((entry, i) => i !== god && expect(entry).toBeNull());
    expect(weaveVerse(verse, { solid: new Set(['θεός', 'ἀρχή']) }).filter(Boolean)).toHaveLength(2);
  });
});

describe('how a word is paired', () => {
  it('pairs a proper name by its transliteration (Iakōb and Jacob, Kain and Cain) and a function word by its place', () => {
    const verse = verseOf('And Cain knew his wife, and she bore Jacob.', [
      word('Καὶ', 'Kai', 'καί', 'CONJ'),
      word('Κάιν', 'Kain', 'Κάιν', 'N-NSM'),
      word('Ἰακώβ', 'Iakōb', 'Ἰακώβ', 'N-ASM'),
    ]);
    const out = alignVerse(verse, () => '').verse;
    const chunk = (t: string) => out.e.find((c) => c.t === t)!;
    expect(chunk('Cain').g).toEqual([1]);
    expect(chunk('Cain').y).toBe('align');
    expect(chunk('Jacob.').g).toEqual([2]);
    expect(chunk('Jacob.').c).toBeGreaterThanOrEqual(0.6);
  });

  it('does not pair a name with an English word that looks nothing like it', () => {
    const verse = verseOf('And God made Adam.', [word('Ἀδάμ', 'Adam', 'Ἀδάμ', 'N-ASM')]);
    const out = alignVerse(verse, () => '').verse;
    expect(out.e.find((c) => c.t === 'Adam.')?.g).toEqual([0]);
    expect(out.e[0]).toEqual({ t: 'And God made', g: [], y: 'align?' });
    const other = alignVerse(verseOf('And God made Seth.', [word('Ἀδάμ', 'Adam', 'Ἀδάμ', 'N-ASM')]), () => '').verse;
    expect(other.e).toEqual([{ t: 'And God made Seth.', g: [], y: 'align?' }]);
  });

  it('pairs a word by its lemma\'s gloss across an inflected English form', () => {
    const verse = verseOf('The earth was unsightly, and the waters moved.', [
      word('γῆ', 'gē', 'γῆ', 'N-NSF'),
      word('ὕδατα', 'hydata', 'ὕδωρ', 'N-NPN'),
    ]);
    const out = alignVerse(verse, (l) => ({ γῆ: 'earth, planet', ὕδωρ: 'water' })[l] ?? '').verse;
    expect(out.e.find((c) => c.t === 'earth')?.g).toEqual([0]);
    expect(out.e.find((c) => c.t === 'waters')?.g).toEqual([1]);
  });

  it('pairs one unmatched Greek word with the one unmatched English word between two pairs, at a low confidence', () => {
    const verse = verseOf('God honoured the light.', [
      word('θεὸς', 'theos', 'θεός', 'N-NSM'),
      word('ἐτίμησεν', 'etimēsen', 'τιμάω', 'V-AAI-3S'),
      word('φῶς', 'phōs', 'φῶς', 'N-ASN'),
    ]);
    const out = alignVerse(verse, (l) => ({ θεός: 'God', φῶς: 'light', τιμάω: 'to esteem' })[l] ?? '').verse;
    const honoured = out.e.find((c) => c.t === 'honoured')!;
    expect(honoured.g).toEqual([1]);
    expect(honoured.c).toBeLessThan(0.5);
  });

  it('carries the supplied words of Brenton\'s brackets to the chunk they fall in', () => {
    const verse = verseOf('God was good', [word('θεὸς', 'theos', 'θεός', 'N-NSM')], [1]);
    const out = alignVerse(verse, () => 'God').verse;
    expect(out.e.map((c) => [c.t, c.s])).toEqual([['God', undefined], ['was good', [0]]]);
    const first = alignVerse(verseOf('was God', [word('θεὸς', 'theos', 'θεός', 'N-NSM')], [0]), () => 'God').verse;
    expect(first.e.map((c) => [c.t, c.s])).toEqual([['was', [0]], ['God', undefined]]);
    const inside = alignVerse(verseOf('the God', [word('θεὸς', 'theos', 'θεός', 'N-NSM')], [1]), () => 'God').verse;
    expect(inside.e.map((c) => [c.t, c.s])).toEqual([['the', undefined], ['God', [0]]]);
  });
});

describe('an unpaired word is never dropped', () => {
  it('leaves the English the aligner cannot pair in a remainder chunk marked y "align?", with no Greek, and the verse\'s chunks joined are Brenton\'s whole verse', () => {
    const verse = verseOf('But the earth was unsightly and unfurnished.', [word('γῆ', 'gē', 'γῆ', 'N-NSF')]);
    const out = alignVerse(verse, () => 'earth').verse;
    expect(out.e.filter((c) => c.y === 'align?').map((c) => [c.t, c.g])).toEqual([['But the', []], ['was unsightly and unfurnished.', []]]);
    expect(joined(out)).toBe('But the earth was unsightly and unfurnished.');
  });

  it('a verse nothing pairs in stays one chunk marked y "align?", and its Greek words have no e', () => {
    const verse = verseOf('Hail, and farewell.', [word('ἀμήν', 'amēn', 'ἀμήν', 'PRT')]);
    const out = alignVerse(verse, () => '').verse;
    expect(out.e).toEqual([{ t: 'Hail, and farewell.', g: [], y: 'align?' }]);
    expect(out.g[0].e).toBeUndefined();
  });

  it('a verse with no English is left as it is', () => {
    const verse: Verse = { n: 1, g: [word('γῆ', 'gē', 'γῆ', 'N-NSF')], e: [] };
    expect(alignVerse(verse, () => 'earth').verse).toEqual(verse);
  });

  it('every verse of Genesis 1, its chunks joined, is Brenton\'s whole verse as the unaligned build has it, and every chunk\'s Greek positions are real', () => {
    expect(gen1.verses).toHaveLength(gen1Plain.verses.length);
    gen1.verses.forEach((verse, i) => {
      expect(joined(verse)).toBe(gen1Plain.verses[i].e[0].t);
      expect(verse.g.map((w) => w.t)).toEqual(gen1Plain.verses[i].g.map((w) => w.t));
      verse.e.forEach((chunk) => chunk.g.forEach((g) => expect(verse.g[g]).toBeDefined()));
      // a Greek word is in at most one chunk
      const used = verse.e.flatMap((c) => c.g);
      expect(new Set(used).size).toBe(used.length);
    });
  });

  it('the supplied words of the unaligned chunk are the supplied words of the chunks, in count', () => {
    const plainSupplied = gen1Plain.verses.flatMap((v) => v.e.flatMap((c) => c.s ?? [])).length;
    const supplied = gen1.verses.flatMap((v) => v.e.flatMap((c) => c.s ?? [])).length;
    expect(supplied).toBe(plainSupplied);
  });
});

describe('the Genesis 1 fixture', () => {
  it('aligns at least the stated share of its Greek words', () => {
    const words = gen1.verses.flatMap((v) => v.g);
    const paired = words.filter((w) => w.e !== undefined).length;
    expect(words).toHaveLength(751);
    expect(paired / words.length).toBeGreaterThanOrEqual(GEN1_SHARE_FLOOR);
    const share = sink.shares.find((s) => s.code === 'gen' && s.chapter === 1)!;
    expect(share).toMatchObject({ words: 751, paired });
  });

  it('two runs give byte-identical files', () => {
    const again = buildLxx(input(), { shares: [] });
    expect([...again.files.keys()]).toEqual([...aligned.files.keys()]);
    for (const [path, text] of aligned.files) expect(again.files.get(path)).toBe(text);
  });

  it('alignChapter on the chapter the build made gives the same chapter the build wrote', () => {
    const { chapter } = alignChapter(gen1Plain, gloss);
    expect(JSON.stringify(chapter)).toBe(JSON.stringify(gen1));
  });
});

describe('the report', () => {
  const shares: AlignShare[] = [
    { code: 'gen', book: 'Genesis', chapter: 1, verses: 31, words: 751, paired: 600, sure: 500, tokens: 800, pairedTokens: 600 },
    { code: 'gen', book: 'Genesis', chapter: 2, verses: 25, words: 500, paired: 250, sure: 200, tokens: 600, pairedTokens: 250 },
  ];

  it('gives the aligned share of each chapter between the markers, and the book\'s', () => {
    const text = renderAlignReport(shares);
    expect(text).toContain('| Genesis 1 | 31 | 751 | 600 | 79.9% | 66.6% |');
    expect(text).toContain('| Genesis 2 | 25 | 500 | 250 | 50.0% | 40.0% |');
    expect(text).toContain('| Genesis | 56 | 1,251 | 850 | 67.9% | 56.0% |');
  });

  it('the docs file has its markers, and what lxx:align writes there is what renderAlignReport gives', () => {
    const doc = readFileSync('docs/lxx-align.md', 'utf8');
    expect(doc).toContain(ALIGN_START);
    expect(doc).toContain(ALIGN_END);
    expect(doc.indexOf(ALIGN_START)).toBeLessThan(doc.indexOf(ALIGN_END));
  });
});

// the ship carries the chunks through (a dry ship: the synthetic Genesis of tests/support/lxx-genesis.ts with Gen 1's English)
describe('npm run lxx:ship carries the chunks to the directory', () => {
  const genesis = syntheticGenesis(50);
  const derive: DeriveInput = { versification: genesis.versification, words: genesis.words, tagnt: [fixture('tagnt-slice.tsv')], tbesg: fixture('tbesg-slice.txt') };
  const result = deriveBook(derive, 'gen');
  const chapterNo = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)![1]);
  const choices = ['ref\tparsing\tlemma\tmark', ...result.pending.filter((p) => chapterNo(p.ref) <= 6).map((p) => `${p.ref}\t${p.candidates[0].morph}\t${p.candidates[0].lemma}\t`)].join('\n') + '\n';
  const passing = (chapters: readonly string[]): KnownScore[] =>
    chapters.map((chapter) => {
      const t = { words: 1000, lemma: 1000, full: 1000 };
      const none = { words: 0, lemma: 0, full: 0 };
      return { chapter, hidden: 'jhn', words: 1000, before: { 1: none, 2: none }, by: { '1': t, '2': none, '2a': none, '3': none, kept: none, none }, all: t, guesses: 0, unanswered: 0, choices: { given: 0, refused: 0, notPending: 0 } };
    });
  const tmpDirs: string[] = [];
  const tmp = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-align-'));
    tmpDirs.push(dir);
    return dir;
  };
  afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);
  const load = async (annotationsDir: string): Promise<LxxInput> => {
    const annotations: Record<string, string> = {};
    if (existsSync(annotationsDir)) for (const f of readdirSync(annotationsDir).sort()) if (f.endsWith('.tsv')) annotations[f.slice(0, -4)] = readFileSync(join(annotationsDir, f), 'utf8');
    return { ...input(), versification: genesis.versification, words: genesis.words, translit: genesis.translit, annotations, usfm: { gen: fixture('lxx2012-gen-1-full.usfm') }, tbesg: fixture('tbesg-gen-1.txt') };
  };
  const options = (): ShipOptions => {
    const choicesDir = tmp();
    writeFileSync(join(choicesDir, 'gen-01.tsv'), choices);
    return { input: derive, load, choicesDir, morpheusDir: tmp(), known: passing, books: [['Gen', 'Genesis']], log: () => undefined };
  };

  it('writes the aligned chunks into the shipped chapters, reports the share of each chapter, and changes no other file of the chapter bar', async () => {
    const out = tmp();
    const done = await runShip(['--out', out, '--no-morpheus'], options());
    const ch = JSON.parse(readFileSync(join(out, 'gen', '1.json'), 'utf8')) as Chapter;
    expect(ch.verses[0].e.length).toBeGreaterThan(1);
    expect(ch.verses[0].e.every((c) => c.y === 'align' || c.y === 'align?')).toBe(true);
    expect(done.books).toEqual([{ code: 'gen', shipped: [1, 2, 3, 4, 5, 6], chapters: 50 }]);
    expect(done.aligned.map((s) => [s.code, s.chapter])).toEqual([1, 2, 3, 4, 5, 6].map((n) => ['gen', n]));
    // the index and the lexicon are the ones a ship made before: the chapters shipped, no new key
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as { books: Array<{ shipped: number[] }> };
    expect(index.books[0].shipped).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lxx:align runs the same ship and writes the report between the markers of docs/lxx-align.md, only there', async () => {
    const doc = join(tmp(), 'lxx-align.md');
    writeFileSync(doc, `# Align\n\nhand-written\n\n${ALIGN_START}\nold\n${ALIGN_END}\n\nafter\n`);
    const lines: string[] = [];
    await runAlign(['--out', tmp(), '--no-morpheus'], { ...options(), doc, log: (l) => lines.push(l) });
    const text = readFileSync(doc, 'utf8');
    expect(text.startsWith('# Align\n\nhand-written\n\n')).toBe(true);
    expect(text.endsWith(`${ALIGN_END}\n\nafter\n`)).toBe(true);
    expect(text).toContain('| Genesis 1 |');
    expect(text).not.toContain('\nold\n');
    const first = text;
    await runAlign(['--out', tmp(), '--no-morpheus'], { ...options(), doc, log: () => undefined });
    expect(readFileSync(doc, 'utf8')).toBe(first);
  });
});
