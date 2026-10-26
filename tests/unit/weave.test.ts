import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { chunkOrder, chunkText, drawnOrder, weaveVerse, wovenInOrder } from '../../src/data/weave';
import { wovenOf } from '../../src/reader/useWoven';

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

  it('never weaves a chunk with no Greek word, one that points at a missing word, a dash or a supplied one', () => {
    const woven = weaveVerse(verse, { solid: new Set(['ἐν', 'Χριστός', 'ὁ', 'θεός']) });
    expect(woven[3]).toBeNull();
    expect(woven[4]).toBeNull();
    expect(woven[5]).toBeNull();
    expect(woven[6]).toBeNull();
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
