// tests/unit/lxx-align-low-confidence.test.ts — the aligner's own low-confidence pairs of the chapters whose pairs were read (story mw-u2w5klk.349.33, Genesis 24 to 29; docs/lxx-align.md, 'A fix of the aligner's own pair'). The Tester's report on
// mw-u2w5klk.349.4: at 390x844, with the Weave on, a tap on 'it' (24:15), 'well.' (29:6), 'departed;' (25:34) and 'Peradventure' (27:12) opened the sheet of a WRONG Greek word (αὐτῆς, λαλοῦντος, ἐφαύλισεν,
// ψηλαφήσῃ). They are pairs the aligner made by place (c 0.3 to 0.5, y 'align'), which the model pass does not re-choose; a `fix` row of the chapter's file under data/lxx/align (applyFixes) moves the Greek word to the
// English that renders it. Here: the fixtures (what the oracle below flags, what the listing shows of a fix), and, when the pinned sources are on the disk (tests/support/lxx-real-data.ts), the real chapters: the pairs by place
// a chapter's sidecar (data/lxx/align/<book>.expect.json, `placePairs`, npm run lxx:align-expect; mw-u2w5klk.349.73) says were read by hand are the ones the ship gives.
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { checkPlacePairs, expectBooks, measureShipped, placePairs, readExpect } from '../../scripts/lxx/align-expect';
import { FIX_RUN, listRemainders, previewFixes, runAlignChoose, type ModelRow } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };

type Lexicon = Record<string, { g: string; d: string }>;


const greek = (t: string, l: string, p: string): GreekWord => ({ t, tr: t, s: '', l, p, y: '1', c: 0.9 });
const LEXICON: Lexicon = { ψηλαφάω: { g: 'to touch', d: 'ψηλαφάω, to feel, handle, touch' }, πατήρ: { g: 'father', d: 'πατήρ, father' }, μή: { g: 'not', d: 'μή, negative particle' }, ποτέ: { g: 'ever', d: 'ποτέ, at some time' }, ἐξέρχομαι: { g: 'to go out', d: 'ἐξέρχομαι, to go or come out' } };
// Genesis 27:12 as the aligner leaves it: 'Peradventure' by place on ψηλαφήσῃ (c 0.4), μή and ποτε with no English, a remainder run of two words, 'father' by gloss, and 'I will' a lead chunk of supplied words
const fixture = (): Chapter => {
  const g = [greek('μή', 'μή', 'PRT'), greek('ποτε', 'ποτέ', 'ADV'), greek('ψηλαφήσῃ', 'ψηλαφάω', 'V-AAS-3S'), greek('πατήρ', 'πατήρ', 'N-NSM'), greek('ἐξελεύσομαι', 'ἐξέρχομαι', 'V-FDI-1S')];
  g[3].e = 2;
  g[2].e = 0;
  g[4].e = 4;
  const e: EnglishChunk[] = [
    { t: 'Peradventure', g: [2], c: 0.4, y: 'align' },
    { t: 'my', g: [], y: 'align?' },
    { t: 'father', g: [3], c: 0.85, y: 'align' },
    { t: 'I will', g: [4], c: 0.5, y: 'align', s: [0, 1] },
    { t: 'go', g: [4], c: 0.4, y: 'align' },
  ];
  const verse: Verse = { n: 12, g, e };
  return { book: 'Genesis', code: 'gen', chapter: 27, lang: 'grc', translation: 'LXX2012', edition: 'swete', lex: {}, parse: {}, verses: [verse] } as unknown as Chapter;
};
const row = (text: string, g: number[]): ModelRow => ({ ref: 'Gen.27:12', run: FIX_RUN, text, g, mark: '', confidence: 0.8 });

describe("the aligner's pairs by place, as the test reads them", () => {
  it("flags 'Peradventure' on ψηλαφήσῃ: a pair by place whose English the lexicon's entry does not say; not 'father' (0.85), not the lead chunk 'I will', not 'go' (the entry says go)", () => {
    expect(placePairs(fixture(), LEXICON)).toEqual(['27:12 Peradventure @2']);
  });

  it("does not flag a pair at 0.6 or above, a pair the definition of the lemma says ('feel' of ψηλαφάω), or a function word's", () => {
    const chapter = fixture();
    chapter.verses[0].e = [{ t: 'feel', g: [2], c: 0.4, y: 'align' }, { t: 'sure', g: [3], c: 0.65, y: 'align' }, { t: 'not', g: [0], c: 0.4, y: 'align' }];
    expect(placePairs(chapter, LEXICON)).toEqual([]);
  });

  it("does not flag a chunk the model or a fix made (y 'model'): the pass chose it", () => {
    const chapter = fixture();
    chapter.verses[0].e[0] = { t: 'Peradventure', g: [0, 1], c: 0.8, y: 'model' };
    expect(placePairs(chapter, LEXICON)).toEqual([]);
  });
});

describe('the listing of lxx:align-choose with the fix rows of a chapter', () => {
  it("shows an aligner pair a fix moves on the Greek words the fix gives: 'Peradventure⟨0,1 fix⟩' for 'Peradventure⟨2⟩', and leaves the run numbers as the ship has them", () => {
    const chapter = fixture();
    const plain = listRemainders(chapter);
    expect(plain).toContain('Peradventure⟨2⟩ {#1 my} father⟨3⟩');
    const listed = listRemainders(chapter, [row('Peradventure', [0, 1])]);
    expect(listed).toContain('English: Peradventure⟨0,1 fix⟩ {#1 my} father⟨3⟩');
    expect(listed.replace('Peradventure⟨0,1 fix⟩', 'Peradventure⟨2⟩')).toBe(plain);
  });

  it('shows a fix of several aligner chunks at the first of them, one that names no Greek word as ⟨-⟩, and no fix of another verse', () => {
    const chapter = fixture();
    expect(listRemainders(chapter, [row('I will go', [4])])).toContain('father⟨3⟩ I will go⟨4 fix⟩');
    expect(listRemainders(chapter, [row('go', [])])).toContain('go⟨- fix⟩');
    expect(listRemainders(chapter, [{ ...row('Peradventure', [0, 1]), ref: 'Gen.27:13' }])).toBe(listRemainders(chapter));
  });

  it("does not show a fix whose English takes in a remainder (the ship applies it after the model's chunks), one found twice, or one found nowhere", () => {
    const chapter = fixture();
    const verse = chapter.verses[0];
    expect(previewFixes(verse, 'Gen.27:12', [row('Peradventure my', [0, 1, 2])]).size).toBe(0);
    expect(previewFixes(verse, 'Gen.27:12', [row('father', [3]), row('nothing of it', [3])]).size).toBe(1);
    verse.e.push({ t: 'father', g: [], c: 0.4, y: 'align' });
    expect(previewFixes(verse, 'Gen.27:12', [row('father', [3])]).size).toBe(0);
  });
});

// The four taps of the Tester's report on mw-u2w5klk.349.4, each `[chapter, verse, the English word, the chunk it is in, the Greek words of that chunk]`.
const TAPS: Array<[number, number, string, string, string[]]> = [
  [24, 15, 'it', 'it came to pass', ['ἐγένετο']],
  [29, 6, 'well.', 'is well.', ['Ὑγιαίνει.']],
  [25, 34, 'departed;', 'departed;', ['ᾤχετο·']],
  [27, 12, 'Peradventure', 'Peradventure', ['μή', 'ποτε']],
];

// The sidecar names the pairs by place of Genesis 12 to 23 (story mw-u2w5klk.349.91): the 185 were read only as a list in mw-u2w5klk.349.83, and a chapter with no `placePairs` is one the real-data test below does not hold.
// This one needs no sources, so a chapter that loses its list fails in every gate; each pair is marked 'read'.
describe('the sidecar of Genesis names the pairs by place of chapters 12 to 23 as read', () => {
  const expectGen = readExpect('gen')!;
  it.each(Array.from({ length: 12 }, (_, i) => i + 12))('chapter %i has a placePairs list, each pair marked read', (n) => {
    const list = expectGen.chapters[String(n)].placePairs;
    expect(list, `gen.expect.json chapter ${n} has no placePairs: npm run lxx:align-expect -- --book gen, then read each pair`).toBeDefined();
    expect(list!.filter(([, why]) => why !== 'read').map(([k]) => k)).toEqual([]);
  });
});

describe.skipIf(!real.run)('the real chapters with the model pass and the fix rows', () => {
  const dirs: string[] = [];
  const chapters = new Map<number, Chapter>();
  let shippedDir = '';
  let stale: string[] = [];
  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-lowconf-'));
    dirs.push(dir);
    const log: string[] = [];
    await runShip(['--out', dir], { ...sources, log: (l) => log.push(l) });
    shippedDir = dir;
    // the chapters of the Tester's four taps (mw-u2w5klk.349.4)
    for (const n of new Set(TAPS.map((t) => t[0]))) chapters.set(n, JSON.parse(readFileSync(join(dir, 'gen', `${n}.json`), 'utf8')) as Chapter);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  const chunkWith = (n: number, v: number, w: string): { chunk: EnglishChunk; verse: Verse } => {
    const verse = chapters.get(n)!.verses.find((x) => x.n === v)!;
    return { chunk: verse.e.find((c) => c.t.split(/\s+/).includes(w))!, verse };
  };

  // The aligner's chunks with c below 0.6 whose Greek word the English does not render, of each chapter whose sidecar names its pairs by place (`placePairs`): the pairs a Builder read against the verse and the lexicon, the rest
  // fixed with a `fix` row. A pair nobody has read fails, and so does a name no chunk has any more, in one line that names the command (scripts/lxx/align-expect.ts checkPlacePairs).
  it('leaves no aligner chunk with c below 0.6 whose Greek word the English does not render, in a chapter whose pairs by place were read, but those named read in its sidecar; none is stale', () => {
    expect(expectBooks().length).toBeGreaterThan(0);
    const problems = expectBooks().flatMap((code) => {
      const expect = readExpect(code)!;
      const named = Object.entries(expect.chapters).filter(([, c]) => c.placePairs !== undefined).map(([n]) => Number(n));
      return checkPlacePairs(code, expect, measureShipped(shippedDir, code, named));
    });
    expect(problems).toEqual([]);
    expect(stale).toEqual([]);
  });

  it.each(TAPS)("Genesis %i:%i: a tap on '%s' opens %s's own Greek word, never another: %s", (n, v, english, text, greekWords) => {
    const { chunk, verse } = chunkWith(n, v, english);
    expect(chunk.t).toBe(text);
    expect(chunk.y).toBe('model');
    expect(chunk.g.map((i) => verse.g[i].t)).toEqual(greekWords);
  });

  it("lists Genesis 27 with 'Peradventure' on μή ποτε, as lxx:align-choose --list --book gen --chapter 27 prints it", async () => {
    const printed: string[] = [];
    await runAlignChoose(['--list', '--book', 'gen', '--chapter', '27'], { ship: sources, print: (t) => printed.push(t) });
    const verse = printed.join('\n').split('\n').findIndex((l) => l === 'Gen.27:12');
    expect(verse).toBeGreaterThanOrEqual(0);
    const lines = printed.join('\n').split('\n').slice(verse, verse + 4);
    expect(lines[1]).toContain('0:μή* 1:ποτε* 2:ψηλαφήσῃ');
    expect(lines[3]).toContain('Peradventure⟨0,1 fix⟩');
    expect(lines[3]).not.toContain('Peradventure⟨2⟩');
  }, 10 * HOOK_TIMEOUT_MS);
});
