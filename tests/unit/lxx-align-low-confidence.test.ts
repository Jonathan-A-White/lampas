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
// this list fails the test, naming it (29:26 younger @12, νεωτέραν, is read and right; added by the batch fixer of batch 585, the lexicon having no entry of νεώτερος): it is to be read by hand, and either fixed (a `fix` row, applyFixes) or added here; so does an entry no chunk has any more. Brenton's English sometimes has another word than
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
    '29:16 elder @8', '29:17 Lea @3', '29:18 I will serve @7', '29:26 country, @8', '29:26 younger @12', '29:27 labor, @12', '29:27 you labor @14', '29:30 Lea; @9', '29:35 ceased @20',
  ],
};

// Genesis 30 to 36 (story mw-u2w5klk.349.36; the Tester's finding on mw-u2w5klk.349.5: 'pillar.' of 31:52, 'offered' of 31:54, 'considered' and 'strangers' of 31:15, 'foolishly.' and 'wrought' of 31:28, 'jealous' of 30:1,
// 'many' and 'cattle,' of 30:43 each opened another Greek word): the same sweep. `placePairs` found 251 pairs by place in the seven chapters, each read by hand against Swete's Greek and the lexicon's entry of its lemma. 36 were
// wrong (an English word on its neighbour's Greek word, as above; 'put' and 'space' of 32:16, 'do' and 'good.' of 32:9, 'man' and 'folly' of 34:7, 'land,' of 35:21, 'stead.' of 36:36) and are moved, with the pairs that came
// with them, by 61 `fix` rows in data/lxx/align/gen-30 to gen-36. The 215 left render their English and are named here, each `chapter:verse English @position`: names (the lexicon has no gloss of 'Balla' or
// 'Chorrhite,'; it says 'ruler' where Brenton says 'chief'), a Greek word whose lemma's entry says another word than Brenton's ('rams,' for ἄρνασιν, 'spotted' for λευκόν where Brenton's text has διάλευκον and
// Swete's does not, 'happily:' for τύχῃ, 'tonight' for νύκτα, 'Heap' for Βουνὸς) and an English phrase that renders one Greek word ('I have served', 'they had defiled', 'let them trade'). Like the list above, a pair by
// place that is not in it fails the test, naming it: it is to be read by hand and either fixed (a `fix` row) or added here; so does an entry no chunk has any more.
const REVIEWED_30_TO_36: Record<number, string[]> = {
  30: [
    '30:4 Balla @3', '30:8 contended @8', '30:8 prevailed; @13', '30:9 she ceased @4', '30:10 Lea @10', '30:11 happily: @4', '30:11 she called @6', '30:15 lie @24',
    '30:15 tonight @28', '30:16 he lay @28', '30:26 wives @3', '30:26 I have served @9', '30:27 coming @18', '30:28 Appoint @0', '30:31 anything; @14', '30:32 rams, @13',
    '30:32 spotted @18', '30:33 whatever @18', '30:33 grey @30', '30:35 separated @1', '30:36 he set @1', '30:36 distance @2', '30:37 walnut @8', '30:38 he laid @1',
    '30:39 streaked @6', '30:43 oxen, @12', '30:43 servants, @14',
  ],
  31: [
    '31:6 have served @9', '31:7 deceived @4', '31:8 speckled @4', '31:9 cattle @6', '31:10 leaping @21', '31:13 appeared @5', '31:13 vowed @16', '31:17 wives @5',
    '31:18 had gotten @12', '31:20 tell @8', '31:21 passed @8', '31:21 went @12', '31:25 stationed @16', '31:26 pillage @12', '31:27 you had told @2', '31:27 mirth, @8',
    '31:27 songs, @11', '31:27 timbrels, @12', '31:28 embrace @2', '31:30 stolen @16', '31:33 Lea, @7', '31:33 Lea, @16', '31:36 strove @4', '31:36 you have pursued @23',
    '31:37 you have searched @2', '31:37 let them decide @29', '31:45 pillar. @6', '31:46 they gathered @9', '31:46 heap, @13', '31:46 heap; @21', '31:48 pillar, @11',
    '31:48 Heap @35', '31:50 one @13',
  ],
  32: [
    '32:1 journey; @6', '32:1 host @12', '32:2 Encampments. @16', '32:5 oxen, @3', '32:5 menservants @9', '32:5 women-servants; @11', '32:5 tell @14',
    '32:7 he divided @7', '32:8 strike @10', '32:8 safety. @19', '32:10 justice @4', '32:16 drove @23', '32:16 drove. @25', '32:17 he charged @1', '32:19 charged @1',
    '32:19 went @13', '32:20 going @20', '32:22 wives @8', '32:23 passed @4', '32:27 answered, @10', '32:28 have prevailed @17', '32:29 Tell @5', '32:30 Face @8',
    '32:31 Face @8', '32:31 halted @13', '32:32 benumbed, @12', '32:32 benumbed. @35',
  ],
  33: [
    '33:1 Lea @23', '33:1 handmaidens. @30', '33:2 put @1', '33:2 handmaidens @4', '33:2 Lea @12', '33:9 keep @7', '33:11 I have brought @5', '33:13 flocks @13',
    '33:13 shall drive @22', '33:13 cattle @29', '33:17 departs @2', '33:17 habitations, @9', '33:17 cattle @12', '33:18 Secima, @6', '33:18 he departed @13',
    '33:19 he bought @1',
  ],
  34: [
    '34:1 Lea, @5', '34:2 Evite, @8', '34:2 lay @16', '34:3 attached @1', '34:3 damsel, @11', '34:3 kindly @16', '34:3 damsel. @18', '34:7 wrought @21', '34:8 chosen @9',
    '34:9 intermarry @0', '34:10 spacious @8', '34:13 they had defiled @18', '34:16 wives @13', '34:21 let them trade @12', '34:23 let us conform @17',
    '34:27 ravaged @9', '34:29 persons @3', '34:30 Chananites @20',
  ],
  35: [
    '35:1 appeared @22', '35:3 let us rise @1', '35:3 calamity, @16', '35:3 preserved @22', '35:3 journey, @26', '35:3 I went. @28', '35:4 ear-rings @16',
    '35:4 Secima, @31', '35:5 Secima, @4', '35:5 children @20', '35:8 oak; @10', '35:8 Oak @17', '35:14 pillar @3', '35:14 pillar @11', '35:16 Chabratha, @17',
    '35:18 ghost @7', '35:19 course @7', '35:20 pillar @3', '35:20 pillar @10', '35:21 lay @12', '35:23 Lea, @1', '35:25 Balla, @2', '35:25 handmaid @3',
    '35:26 handmaid @3', '35:26 Lea; @4', '35:29 laid @4',
  ],
  36: [
    '36:1 generations @3', '36:2 Chananites; @9', '36:2 Chettite; @15', '36:2 Evite; @25', '36:6 persons @15', '36:6 cattle, @25', '36:9 generations @3', '36:10 Ada, @9',
    '36:12 Ada, @17', '36:15 chiefs @2', '36:15 chief @9', '36:15 chief @11', '36:15 chief @13', '36:15 chief @15', '36:16 chief @0', '36:16 chief @2',
    '36:16 Gothom, @3', '36:16 chief @4', '36:16 chiefs @7', '36:16 Ada. @14', '36:17 chief @6', '36:17 chief @8', '36:17 chiefs @15', '36:18 chief @6', '36:18 Jeus, @7',
    '36:18 chief @8', '36:18 chief @10', '36:18 chiefs @13', '36:19 chiefs; @7', '36:21 chiefs @8', '36:21 Chorrhite, @10', '36:23 Sophar, @9', '36:23 Omar. @11',
    '36:24 Ana; @6', '36:24 Ana @10', '36:24 Jamin @14', '36:24 wilderness, @17', '36:24 tended @19', '36:26 Amada, @4', '36:28 Hos, @4', '36:28 Aran. @6',
    '36:29 chiefs @1', '36:29 chief @3', '36:29 chief @5', '36:29 chief @7', '36:30 chief @0', '36:30 chief @2', '36:30 chief @4', '36:30 chiefs @7', '36:31 Israel. @13',
    '36:33 Jobab, @7', '36:34 Asom, @7', '36:39 Arad @9', '36:40 chiefs @4', '36:40 chief @24', '36:40 chief @26', '36:40 Jether, @27', '36:41 chief @0',
    '36:41 chief @2', '36:41 Helas, @3', '36:41 chief @4', '36:42 chief @0', '36:42 chief @2', '36:42 chief @4', '36:43 chief @0', '36:43 chief @2', '36:43 chiefs @5',
    '36:43 dwelling-places @9',
  ],
};

// The four taps of the Tester's report on mw-u2w5klk.349.4, each `[chapter, verse, the English word, the chunk it is in, the Greek words of that chunk]`.
const TAPS: Array<[number, number, string, string, string[]]> = [
  [24, 15, 'it', 'it came to pass', ['ἐγένετο']],
  [29, 6, 'well.', 'is well.', ['Ὑγιαίνει.']],
  [25, 34, 'departed;', 'departed;', ['ᾤχετο·']],
  [27, 12, 'Peradventure', 'Peradventure', ['μή', 'ποτε']],
];

describe.skipIf(!real.run)('Genesis 24 to 36 with the model pass and the fix rows (the real data)', () => {
  const dirs: string[] = [];
  const chapters = new Map<number, Chapter>();
  let lexicon: Lexicon = {};
  let stale: string[] = [];
  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-lowconf-'));
    dirs.push(dir);
    const log: string[] = [];
    await runShip(['--out', dir], { ...sources, log: (l) => log.push(l) });
    for (let n = 24; n <= 36; n++) chapters.set(n, JSON.parse(readFileSync(join(dir, 'gen', `${n}.json`), 'utf8')) as Chapter);
    lexicon = JSON.parse(readFileSync(join(dir, 'lexicon-grc-lxx.json'), 'utf8')) as Lexicon;
    stale = log.filter((l) => /model pass, chapter (2[4-9]|3[0-6]):/.test(l));
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

  it("leaves no aligner chunk of Genesis 30 to 36 with c below 0.6 whose Greek word the English does not render, but those reviewed by hand; none is stale", () => {
    const found = [30, 31, 32, 33, 34, 35, 36].flatMap((n) => placePairs(chapters.get(n)!, lexicon));
    const reviewed = Object.values(REVIEWED_30_TO_36).flat();
    expect(found.filter((p) => !reviewed.includes(p)), 'a pair by place nobody has read').toEqual([]);
    expect(reviewed.filter((p) => !found.includes(p)), 'a reviewed pair that is no longer there').toEqual([]);
    expect(reviewed).toHaveLength(215);
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
