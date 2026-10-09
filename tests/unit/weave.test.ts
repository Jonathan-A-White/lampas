import { describe, expect, it } from 'vitest';
import type { GreekWord, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';

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
    { t: 'is', g: [0], s: 1 },
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
