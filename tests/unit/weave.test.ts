import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { chunkOrder, chunkText, drawnOrder, goneOf, weaveVerse, wovenInOrder } from '../../src/data/weave';
import { wovenOf } from '../../src/reader/useWoven';
import { alignChapter } from '../../scripts/lxx/align';

const word = (t: string, l: string): GreekWord => ({ t, tr: '', s: 'G1', l, p: 'N-NSM' });

const verse: Verse = {
  n: 1,
  g: [word('ἐν', 'ἐν'), word('χριστῷ', 'Χριστός'), word('τοῦ', 'ὁ'), word('θεοῦ', 'θεός')],
  e: [
    { t: 'in', g: [0] },
    { t: 'Christ', g: [1] },
    { t: 'the God', g: [2, 3] },
    { t: 'nothing', g: [] },
    { t: 'lost', g: [9] },
    { t: '-', g: [0] },
    { t: 'is', g: [0], s: [0] },
  ],
};

describe('weaveVerse', () => {
  it('weaves a chunk whose every Greek word has a solid lemma, in the chunk order', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν', 'Χριστός']) });
    expect(woven[0]?.words.map((w) => w.t)).toEqual(['ἐν']);
    expect(woven[1]?.words.map((w) => w.t)).toEqual(['χριστῷ']);
  });

  it('leaves English a chunk backed by two Greek words of which one is unknown, and its neighbours stay woven', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν', 'Χριστός', 'ὁ']) });
    expect(woven[2]).toBeNull();
    expect(woven[0]).not.toBeNull();
    expect(woven[1]).not.toBeNull();
  });

  it('weaves a two-word chunk when both lemmas are solid', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ὁ', 'θεός']) });
    expect(woven[2]?.words.map((w) => w.t)).toEqual(['τοῦ', 'θεοῦ']);
  });

  it('never weaves a chunk with no Greek word, one that points at a missing word, a dash or a chunk of supplied words only', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν', 'Χριστός', 'ὁ', 'θεός']) });
    expect(woven[3]).toBeNull();
    expect(woven[4]).toBeNull();
    expect(woven[5]).toBeNull();
    expect(woven[6]).toBeNull();
  });

  it("weaves a one-word chunk with supplied words when it has English of its own ('[the] beginning,'), so the Greek stands for the whole chunk (mw-5r3p30.947)", () => {
    const supplied: Verse = { ...verse, e: [{ t: 'the beginning,', g: [0], s: [0] }, { t: 'is', g: [0], s: [0] }, { t: '-', g: [0] }] };
    const woven = weaveVerse(supplied, { solid: new Set(['ἐν']) });
    expect(woven[0]?.words.map((w) => w.t)).toEqual(['ἐν']);
    expect(woven[1]).toBeNull();
    expect(woven[2]).toBeNull();
  });

  it('weaves nothing for an empty set', () => {
    expect(weaveVerse(verse, { solid: new Set() }).every((w) => w === null)).toBe(true);
  });

  it('matches a word whose lemma is written in another normalisation form', () => {
    const decomposed: Verse = { ...verse, g: [word('ἐν', 'ἐν'.normalize('NFD'))] };
    expect(weaveVerse(decomposed, { solid: new Set(['ἐν']) })[0]).not.toBeNull();
  });

  it('weaves a chunk of learning words with learning: true, and a solid chunk with learning: false', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν']), learning: new Set(['Χριστός']) });
    expect(woven[0]).toEqual({ words: [verse.g[0]], learning: false });
    expect(woven[1]).toEqual({ words: [verse.g[1]], learning: true });
  });

  it('weaves a chunk mixing solid and learning words and marks it learning', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ὁ']), learning: new Set(['θεός']) });
    expect(woven[2]?.words.map((w) => w.t)).toEqual(['τοῦ', 'θεοῦ']);
    expect(woven[2]?.learning).toBe(true);
  });

  it('does not weave a chunk with an unknown word, learning words around it or not', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν']), learning: new Set(['ὁ']) });
    expect(woven[2]).toBeNull();
    expect(woven[0]).not.toBeNull();
  });

  it('weaves a learning lemma only when the learning set is given', () => {
    expect(weaveVerse(verse, { solid: new Set(['ἐν']) })[1]).toBeNull();
  });

  it('a lemma that is both solid and learning counts as solid', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν']), learning: new Set(['ἐν']) });
    expect(woven[0]?.learning).toBe(false);
  });

  it('leaves a chunk English when formPasses refuses one of its words, and its neighbours stay woven', () => {
    const all = new Set(['ἐν', 'Χριστός', 'ὁ', 'θεός']);
    const woven = weaveVerse(verse, { solid: all, formPasses: (w) => w.t !== 'θεοῦ' });
    expect(woven[0]).not.toBeNull();
    expect(woven[1]).not.toBeNull();
    expect(woven[2]).toBeNull();
  });

  it('weaves every solid chunk as before when formPasses accepts all, or is not given', () => {
    const solid = new Set(['ἐν', 'Χριστός', 'ὁ', 'θεός']);
    const plain = weaveVerse(verse, { solid });
    expect(weaveVerse(verse, { solid, formPasses: () => true })).toEqual(plain);
    expect(plain.filter(Boolean)).toHaveLength(3);
  });

  it('asks formPasses about a learning word too', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν']), learning: new Set(['Χριστός']), formPasses: (w) => w.t !== 'χριστῷ' });
    expect(woven[0]).not.toBeNull();
    expect(woven[1]).toBeNull();
  });
});

// The weave on an Old Testament chapter ('hbo', mw-5vvlay.1): the same layout, the Hebrew words standing where the Greek would. Genesis 1:1 is the copy of the built
// chapter in tests/fixtures/data/gen/1.json (scripts/fixture-chapter.mjs): בְּרֵאשִׁית (g 0) is 'In the beginning', בָּרָא (g 1) 'created' and אֱלֹהִים (g 2) 'God', which the
// English puts before 'created'; אֵת (g 3) has no English, and 'and' stands for the conjunction of וְאֵת (g 5).
const genesis1 = JSON.parse(readFileSync('tests/fixtures/data/gen/1.json', 'utf8')) as Chapter;
const gen1v1 = genesis1.verses[0];
const englishOf = (order: readonly number[]): string => order.map((i) => gen1v1.e[i].t).join(' ');

describe('the weave of Genesis 1:1', () => {
  it('is a Hebrew chapter whose first verse has seven words and six English chunks', () => {
    expect(genesis1.lang).toBe('hbo');
    expect(gen1v1.g.map((w) => w.t)[0]).toBe('בְּרֵאשִׁ֖ית');
    expect(gen1v1.g).toHaveLength(7);
    expect(gen1v1.e.map((c) => c.t)).toEqual(['In the beginning', 'God', 'created', 'the heavens', 'and', 'the earth.']);
  });

  it('weaves the chunks whose Hebrew lemma is solid, with the words in the Hebrew order of the chunk', () => {
    const woven = weaveVerse(gen1v1, { solid: new Set(['רֵאשִׁית', 'אֱלֹהִים']) });
    expect(woven.map((w) => w?.words.map((x) => x.t) ?? null)).toEqual([['בְּרֵאשִׁ֖ית'], ['אֱלֹהִ֑ים'], null, null, null, null]);
  });

  it('lays the English chunks out in the English order, with no order of its own', () => {
    const woven = weaveVerse(gen1v1, { solid: new Set(['רֵאשִׁית']) });
    const laid = wovenInOrder(gen1v1, woven, 'english');
    expect(drawnOrder(gen1v1, laid)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(englishOf(drawnOrder(gen1v1, laid))).toBe('In the beginning God created the heavens and the earth.');
  });

  it('lays them out in the Hebrew word order (the Order Greek of the code is the source order): created stands before God', () => {
    const woven = weaveVerse(gen1v1, { solid: new Set(['רֵאשִׁית', 'אֱלֹהִים']) });
    const laid = wovenInOrder(gen1v1, woven, 'greek');
    expect(chunkOrder(gen1v1, 'greek')).toEqual([0, 2, 1, 3, 4, 5]);
    expect(drawnOrder(gen1v1, laid)).toEqual([0, 2, 1, 3, 4, 5]);
    expect(englishOf(drawnOrder(gen1v1, laid))).toBe('In the beginning created God the heavens and the earth.');
    expect(chunkText(gen1v1, laid, 5)).toBe('the earth.');
  });
});

describe('wovenOf on a Hebrew chapter', () => {
  const weaving = { view: 'english' as const, weave: 'solid' as const, weaveShown: true, weaveOrder: 'greek' as const, solid: new Set(['רֵאשִׁית']), learning: new Set<string>(), levels: new Map() };

  it('weaves Genesis 1 in the source order', () => {
    const woven = wovenOf(genesis1, { ...weaving, weaveGrammar: 'any' });
    expect(woven).not.toBeNull();
    expect(woven?.[0][0]?.words[0].t).toBe('בְּרֵאשִׁ֖ית');
    expect(woven?.[0].order).toEqual([0, 2, 1, 3, 4, 5]);
  });

  it('does not let the grammar dial (which knows the Greek parsing codes) hold a Hebrew form back', () => {
    const woven = wovenOf(genesis1, { ...weaving, weaveGrammar: 'solid' });
    expect(woven?.[0][0]?.words[0].t).toBe('בְּרֵאשִׁ֖ית');
  });
});

// mw-u2w5klk.349.69 (the Governor: "In weave mode, when would the added English words fall away?" Yes: once the words on both sides are in Greek): an English chunk
// with no Greek of its own, or only supplied words, is not drawn when the nearest drawn chunk on each side of it is woven; at a verse's end the one neighbour decides.
describe('an added English word falls away once the words around it are in Greek', () => {
  const read = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
  const plain = read<Chapter>('tests/fixtures/data-lxx/gen/1.json');
  const lexicon = read<Record<string, { g?: string }>>('tests/fixtures/data-lxx/lexicon-grc-lxx.json');
  const lxx = alignChapter(plain, (lemma) => lexicon[lemma]?.g ?? '').chapter;
  const weaving = { view: 'english' as const, weave: 'solid' as const, weaveShown: true, weaveGrammar: 'any' as const, learning: new Set<string>(), levels: new Map() };
  const goneIn = (chapter: Chapter, solid: string[], weaveOrder: 'english' | 'greek' = 'english', n = 0): boolean[] => {
    const woven = wovenOf(chapter, { ...weaving, solid: new Set(solid), weaveOrder });
    return (woven?.[n] ?? []).map((_, i) => goneOf(woven?.[n], i));
  };
  const the = lxx.verses[0].e.findIndex((c) => c.t === 'the' && c.g.length === 0);

  it("Genesis 1:1 'the' of 'In the beginning' has no Greek: the aligner knows it is added", () => {
    expect(the).toBe(1);
    expect(lxx.verses[0].e[the].y).toBe('align?');
  });

  it("draws no 'the' when Ἐν and ἀρχή are both known, in either order", () => {
    for (const order of ['english', 'greek'] as const) expect(goneIn(lxx, ['ἐν', 'ἀρχή'], order)[the]).toBe(true);
  });

  it("draws the 'the' when ἀρχή is not known (a neighbour is English), or Ἐν is not", () => {
    expect(goneIn(lxx, ['ἐν'])[the]).toBe(false);
    expect(goneIn(lxx, ['ἀρχή'])[the]).toBe(false);
    expect(goneIn(lxx, [])[the]).toBe(false);
  });

  it('drops only chunks that have no Greek of their own: woven and English chunks are never gone', () => {
    const gone = goneIn(lxx, ['ἐν', 'ἀρχή', 'ποιέω', 'θεός', 'ὁ', 'οὐρανός', 'καί', 'γῆ']);
    expect(gone.map((g, i) => (g ? lxx.verses[0].e[i].t : null)).filter((t) => t !== null)).toEqual(['the']);
  });

  it('a chunk English because its Greek is not paired yet (data:build:lxx\'s one chunk with every word) is drawn as before', () => {
    const everything = plain.verses[0].g.map((w) => w.l);
    expect(goneIn(plain, everything)).toEqual([false]);
  });

  describe("an English-only chunk of the New Testament made of supplied words", () => {
    const base: Verse = { n: 1, g: [word('ἐν', 'ἐν'), word('τοῦ', 'ὁ'), word('χριστῷ', 'Χριστός')], e: [{ t: 'in', g: [0] }, { t: 'is', g: [1], s: [0] }, { t: 'Christ', g: [2] }] };
    const chapterOf = (verses: Verse[]): Chapter => ({ ...lxx, verses });

    it('falls away between two woven chunks', () => {
      expect(goneIn(chapterOf([base]), ['ἐν', 'Χριστός'])).toEqual([false, true, false]);
    });

    it('stays between a woven chunk and an English one, and when neither is woven', () => {
      expect(goneIn(chapterOf([base]), ['ἐν'])).toEqual([false, false, false]);
      expect(goneIn(chapterOf([base]), ['Χριστός'])).toEqual([false, false, false]);
      expect(goneIn(chapterOf([base]), [])).toEqual([false, false, false]);
    });

    it('stays when it stands for a Greek word he knows, which is drawn in gold beside it', () => {
      expect(goneIn(chapterOf([base]), ['ἐν', 'ὁ', 'Χριστός'])).toEqual([false, false, false]);
    });

    it('is not a chunk that has English of its own with supplied words: that one is woven or English, never gone', () => {
      const own: Verse = { ...base, e: [{ t: 'in', g: [0] }, { t: 'the beginning', g: [1], s: [0] }, { t: 'Christ', g: [2] }] };
      expect(goneIn(chapterOf([own]), ['ἐν', 'Χριστός'])).toEqual([false, false, false]);
    });
  });

  describe("the Order he has set decides who the neighbours are (an English chunk with no Greek stands behind the chunk before it in the English)", () => {
    // Greek: A=ἐν(0) B=Χριστός(1); English: B, the, A. English order draws B the A; Greek order draws A B the
    const swapped: Verse = { n: 1, g: [word('ἐν', 'ἐν'), word('χριστῷ', 'Χριστός')], e: [{ t: 'Christ', g: [1] }, { t: 'the', g: [] }, { t: 'in', g: [0] }] };
    const chapter: Chapter = { ...lxx, verses: [swapped] };

    it('English order: its English neighbours, so it falls away only when both are woven', () => {
      expect(goneIn(chapter, ['ἐν', 'Χριστός'], 'english')[1]).toBe(true);
      expect(goneIn(chapter, ['ἐν'], 'english')[1]).toBe(false);
      expect(goneIn(chapter, ['Χριστός'], 'english')[1]).toBe(false);
    });

    it('Greek order: it stands at the verse end after Christ, so the one neighbour (Christ, drawn last) decides', () => {
      expect(chunkOrder(swapped, 'greek')).toEqual([2, 0, 1]);
      expect(goneIn(chapter, ['Χριστός'], 'greek')[1]).toBe(true);
      expect(goneIn(chapter, ['ἐν'], 'greek')[1]).toBe(false);
    });
  });
});
