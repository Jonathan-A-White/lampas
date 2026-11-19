// tests/unit/lxx-align-low-confidence.test.ts — the aligner's own low-confidence pairs of Genesis 24 to 29 (story mw-u2w5klk.349.33; docs/lxx-align.md, 'A fix of the aligner's own pair'). The Tester's report on
// mw-u2w5klk.349.4: at 390x844, with the Weave on, a tap on 'it' (24:15), 'well.' (29:6), 'departed;' (25:34) and 'Peradventure' (27:12) opened the sheet of a WRONG Greek word (αὐτῆς, λαλοῦντος, ἐφαύλισεν,
// ψηλαφήσῃ). They are pairs the aligner made by place (c 0.3 to 0.5, y 'align'), which the model pass does not re-choose; a `fix` row of data/lxx/align/gen-NN.tsv (applyFixes) moves the Greek word to the
// English that renders it. Here: the fixtures (what the oracle below flags, what the listing shows of a fix), and, when the pinned sources are on the disk (tests/support/lxx-real-data.ts), the real chapters.
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { lettersOf, stemOf, SUPPLIED_FOR_VERB, SURE } from '../../scripts/lxx/align';
import { FIX_RUN, listRemainders, previewFixes, runAlignChoose, type ModelRow } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };

type Lexicon = Record<string, { g: string; d: string }>;

const isContent = (w: GreekWord): boolean => /^(N|A|V)-/.test(w.p) || w.p === 'ADV';
const stemsOf = (text: string): Set<string> => new Set(text.split(/[^\p{L}]+/u).map(lettersOf).filter((x) => x.length > 1).map(stemOf));

/**
 * The aligner's own chunks (y 'align') with a confidence below SURE (0.6) whose Greek word is a noun, adjective, verb or adverb and whose English no gloss or definition of the Greek word's lemma in the shipped
 * lexicon (the gloss `g` and the definition `d`) says: the pairs made by place, where an English word has been given the Greek word that sits at the same place, and no more. Each is `chapter:verse English @position`.
 * A chunk of the words Brenton supplies for a verb ('I will', 'you shall') is a lead chunk that points at the verb's Greek word by design (joinSupplied), and is left out.
 */
export function placePairs(chapter: Pick<Chapter, 'chapter' | 'verses'>, lexicon: Lexicon): string[] {
  const out: string[] = [];
  for (const verse of chapter.verses) {
    for (const chunk of verse.e) {
      if (chunk.y !== 'align' || !(chunk.c !== undefined && chunk.c < SURE) || chunk.g.length !== 1) continue;
      if (chunk.t.split(/\s+/).every((w) => SUPPLIED_FOR_VERB.has(lettersOf(w)))) continue;
      const word = verse.g[chunk.g[0]];
      if (!word || !isContent(word)) continue;
      const entry = lexicon[word.l];
      const said = stemsOf(`${entry?.g ?? ''} ${entry?.d ?? ''}`);
      const english = stemOf(lettersOf(chunk.t));
      if (said.has(english) || (english.length > 3 && [...said].some((s) => s.startsWith(english.slice(0, 4))))) continue;
      out.push(`${chapter.chapter}:${verse.n} ${chunk.t} @${chunk.g[0]}`);
    }
  }
  return out;
}

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

// Genesis 24 to 29, as reviewed by hand (this story's Builder) against Swete's Greek and the lexicon's entry of each lemma: the pairs by place (placePairs) of the chapters after the fix rows, each `chapter:verse English @position`,
// that DO render the English. The ones that did not are fixed and are not here: the fix rows of data/lxx/align/gen-24 to gen-29 moved 33 of the 212 the same function found before them. A pair by place that is not in
// this list fails the test, naming it: it is to be read by hand, and either fixed (a `fix` row, applyFixes) or added here; so does an entry no chunk has any more. Brenton's English sometimes has another word than
// Swete's Greek ('Chettite.' for Εὑαίου, 26:34): the Greek word that sits there is the one a tap should open.
const REVIEWED: Record<number, string[]> = {
  24: [
    '24:3 Chananites, @23', '24:8 come @6', '24:10 he arose @23', '24:10 went @24', '24:11 he rested @1', '24:12 deal @13', '24:15 daughter @15', '24:17 servant @3', '24:18 Sir; @4',
    '24:18 pitcher @10', '24:19 have drunk. @13', '24:20 trough, @8', '24:22 bracelets @18', '24:23 Tell @8', '24:25 resting. @13', '24:27 suffered @10', '24:30 ear-rings @5',
    '24:30 bracelets @8', '24:31 have prepared @13', '24:32 unloaded @8', '24:33 loaves @3', '24:34 servant @2', '24:35 calves, @14', '24:35 servants @19', '24:37 Chananites, @17',
    '24:37 sojourn @21', '24:40 acceptable @7', '24:41 clear @21', '24:42 going, @23', '24:43 damsel @21', '24:44 have wrought @25', '24:45 pitcher @16', '24:46 pitcher @4', '24:47 you? tell @8',
    '24:47 ear-rings, @28', '24:47 bracelets @31', '24:48 being @1', '24:49 justly @6', '24:49 tell @11', '24:52 servant @6', '24:53 jewels @4', '24:53 raiment, @9', '24:54 he arose @15',
    '24:56 journey @12', '24:57 damsel, @5', '24:57 enquire @7', '24:58 Will you go @6', '24:58 I will go. @13', '24:59 servant @12', '24:60 enemies. @24', '24:61 maidens, @5', '24:61 went @12',
    '24:62 went @2', '24:62 wilderness @5', '24:62 lived @13', '24:65 servant, @3', '24:65 walks @10', '24:65 servant @20',
  ],
  25: [
    '25:2 Jezan, @7', '25:4 Abeida, @9', '25:4 Eldaga; @11', '25:9 Chettite, @22', '25:12 generations @3', '25:12 handmaid @12', '25:16 princes @20', '25:18 Sur, @5', '25:18 opposite @9',
    '25:19 generations @3', '25:22 enquire @19', '25:23 elder @25', '25:23 shall serve @26', '25:23 younger. @28', '25:27 skilled @8', '25:29 fainting. @10', '25:31 Sell @5', '25:32 going @5',
    '25:34 pottage @7',
  ],
  26: [
    '26:3 sojourn @1', '26:3 I will establish @25', '26:8 sporting @16', '26:14 cattle @3', '26:14 cattle @6', '26:14 oxen, @7', '26:15 servants @7', '26:15 filled @22', '26:17 rested @5',
    '26:17 lived @11', '26:18 dug @3', '26:18 servants @11', '26:19 servants @3', '26:20 saying @9', '26:21 Enmity. @17', '26:22 strive @8', '26:22 Room, @16', '26:25 servants @19',
    '26:26 came @2', '26:28 We have surely @2', '26:28 oath @12', '26:29 wrong @4', '26:29 according @12', '26:29 have treated @13', '26:31 they arose @1', '26:31 each @5',
    '26:31 they departed @14', '26:32 servants @9', '26:32 told @11', '26:32 they had dug; @17', '26:34 Judith @8', '26:34 Beoch @10', '26:34 Chettite, @12', '26:34 Helon @17',
    '26:34 Chettite. @19', '26:35 provoking @2',
  ],
  27: [
    '27:3 weapons, @4', '27:3 get @17', '27:3 venison, @19', '27:5 procure @16', '27:5 venison @17', '27:7 venison, @2', '27:7 prepare @4', '27:7 eat @8', '27:9 go @1', '27:9 he likes. @21',
    '27:13 son; @10', '27:14 went @0', '27:17 loaves @6', '27:17 she had prepared, @8', '27:18 son? @17', '27:19 told @16', '27:21 will feel @8', '27:21 son, @10', '27:26 son. @12',
    '27:28 abundance @18', '27:30 presence @18', '27:35 subtlety, @8', '27:36 behold! @11', '27:37 brethren @14', '27:37 son? @28', '27:40 break @15', '27:43 son, @2', '27:45 fetch @20',
    '27:46 weary @5',
  ],
  28: [
    '28:1 charged @8', '28:1 Chananites. @17', '28:3 you shall become @13', '28:5 he went @6', '28:6 Chananites; @31', '28:7 went @10', '28:10 departed @9', '28:12 top @11', '28:13 stood @3',
    '28:13 lie, @26', '28:15 preserve @5', '28:15 I will bring @15', '28:15 have said @32', '28:17 afraid, @1', '28:18 pillar, @18', '28:20 going, @21', '28:20 raiment @28', '28:21 bring @1',
    '28:22 pillar, @6',
  ],
  29: [
    '29:2 he looks, @1', '29:3 flocks, @18', '29:3 set @20', '29:4 Brethren, @4', '29:6 well? @3', '29:7 flocks, @14', '29:8 flocks. @23', '29:9 While @0', '29:13 told @29', '29:14 month. @20',
    '29:16 elder @8', '29:17 Lea @3', '29:18 I will serve @7', '29:26 country, @8', '29:27 labor, @12', '29:27 you labor @14', '29:30 Lea; @9', '29:35 ceased @20',
  ],
};

// The four taps of the Tester's report on mw-u2w5klk.349.4, each `[chapter, verse, the English word, the chunk it is in, the Greek words of that chunk]`.
const TAPS: Array<[number, number, string, string, string[]]> = [
  [24, 15, 'it', 'it came to pass', ['ἐγένετο']],
  [29, 6, 'well.', 'is well.', ['Ὑγιαίνει.']],
  [25, 34, 'departed;', 'departed;', ['ᾤχετο·']],
  [27, 12, 'Peradventure', 'Peradventure', ['μή', 'ποτε']],
];

describe.skipIf(!real.run)('Genesis 24 to 29 with the model pass and the fix rows (the real data)', () => {
  const dirs: string[] = [];
  const chapters = new Map<number, Chapter>();
  let lexicon: Lexicon = {};
  let stale: string[] = [];
  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-lowconf-'));
    dirs.push(dir);
    const log: string[] = [];
    await runShip(['--out', dir], { ...sources, log: (l) => log.push(l) });
    for (let n = 24; n <= 29; n++) chapters.set(n, JSON.parse(readFileSync(join(dir, 'gen', `${n}.json`), 'utf8')) as Chapter);
    lexicon = JSON.parse(readFileSync(join(dir, 'lexicon-grc-lxx.json'), 'utf8')) as Lexicon;
    stale = log.filter((l) => /model pass, chapter (24|25|26|27|28|29):/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  const chunkWith = (n: number, v: number, w: string): { chunk: EnglishChunk; verse: Verse } => {
    const verse = chapters.get(n)!.verses.find((x) => x.n === v)!;
    return { chunk: verse.e.find((c) => c.t.split(/\s+/).includes(w))!, verse };
  };

  it("leaves no aligner chunk of Genesis 24 to 29 with c below 0.6 whose Greek word the English does not render, but those reviewed by hand; none is stale", () => {
    const found = [24, 25, 26, 27, 28, 29].flatMap((n) => placePairs(chapters.get(n)!, lexicon));
    const reviewed = Object.values(REVIEWED).flat();
    expect(found.filter((p) => !reviewed.includes(p)), 'a pair by place nobody has read').toEqual([]);
    expect(reviewed.filter((p) => !found.includes(p)), 'a reviewed pair that is no longer there').toEqual([]);
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
  });
});
