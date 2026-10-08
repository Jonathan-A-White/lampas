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
    const woven = weaveVerse(verse, new Set(['ἐν', 'Χριστός']));
    expect(woven[0]?.map((w) => w.t)).toEqual(['ἐν']);
    expect(woven[1]?.map((w) => w.t)).toEqual(['χριστῷ']);
  });

  it('leaves English a chunk backed by two Greek words of which one is unknown, and its neighbours stay woven', () => {
    const woven = weaveVerse(verse, new Set(['ἐν', 'Χριστός', 'ὁ']));
    expect(woven[2]).toBeNull();
    expect(woven[0]).not.toBeNull();
    expect(woven[1]).not.toBeNull();
  });

  it('weaves a two-word chunk when both lemmas are solid', () => {
    const woven = weaveVerse(verse, new Set(['ὁ', 'θεός']));
    expect(woven[2]?.map((w) => w.t)).toEqual(['τοῦ', 'θεοῦ']);
  });

  it('never weaves a chunk with no Greek word, one that points at a missing word, a dash or a supplied one', () => {
    const woven = weaveVerse(verse, new Set(['ἐν', 'Χριστός', 'ὁ', 'θεός']));
    expect(woven[3]).toBeNull();
    expect(woven[4]).toBeNull();
    expect(woven[5]).toBeNull();
    expect(woven[6]).toBeNull();
  });

  it('weaves nothing for an empty set', () => {
    expect(weaveVerse(verse, new Set()).every((w) => w === null)).toBe(true);
  });

  it('matches a word whose lemma is written in another normalisation form', () => {
    const decomposed: Verse = { ...verse, g: [word('ἐν', 'ἐν'.normalize('NFD'))] };
    expect(weaveVerse(decomposed, new Set(['ἐν']))[0]).not.toBeNull();
  });
});
