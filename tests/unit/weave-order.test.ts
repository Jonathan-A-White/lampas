// The Weave's Order (mw-5r3p30.250): English lays a verse out in the MSB's English order, Greek in the table's Greek order, each English chunk
// standing where its first Greek word stands.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { chunkOrder, weaveVerse, wovenInOrder } from '../../src/data/weave';
import { runsOf } from '../../src/speech/readAloud';

const firstJohn2 = JSON.parse(readFileSync('public/data/1jn/2.json', 'utf8')) as Chapter;
const verse1 = firstJohn2.verses[0];
const textIn = (verse: Verse, order: readonly number[]): string => order.map((i) => verse.e[i].t).join(' ');

describe('chunkOrder on 1 John 2:1', () => {
  it('English is the MSB English order, unchanged', () => {
    const order = chunkOrder(verse1, 'english');
    expect(order).toEqual(verse1.e.map((_, i) => i));
    expect(textIn(verse1, order)).toBe(
      'My little children, I am writing these things to you so that you will not sin. But if anyone does sin, we have an advocate before the Father — Jesus Christ, the Righteous One.',
    );
  });

  it('Greek follows the table\'s Greek sort: each chunk stands where its first Greek word stands', () => {
    const order = chunkOrder(verse1, 'greek');
    // Τεκνία μου ταῦτα γράφω ... παράκλητον ἔχομεν ...
    expect(textIn(verse1, order)).toBe(
      'little children, My these things I am writing to you so that you will not sin. But if anyone does sin, an advocate we have before the Father — Jesus Christ, the Righteous One.',
    );
    const firstGreek = order.map((i) => Math.min(...verse1.e[i].g));
    expect(firstGreek).toEqual([...firstGreek].sort((a, b) => a - b));
    // every chunk once
    expect([...order].sort((a, b) => a - b)).toEqual(verse1.e.map((_, i) => i));
  });
});

const word = (t: string, l: string, e?: number): GreekWord => ({ t, tr: '', s: 'G1', l, p: 'N-NSM', e });

describe('chunkOrder on chunks the Greek does not place alone', () => {
  // Greek: ὁ λόγος ἦν θεός; English: 'the Word was [indeed] God' with 'the Word' rendering two words, 'indeed' none
  const verse: Verse = {
    n: 1,
    g: [word('θεὸς', 'θεός', 3), word('ἦν', 'εἰμί', 1), word('ὁ', 'ὁ', 0), word('λόγος', 'λόγος', 0)],
    e: [
      { t: 'the Word', g: [2, 3] },
      { t: 'was', g: [1] },
      { t: 'indeed', g: [], s: [0] },
      { t: 'God.', g: [0] },
    ],
  };

  it('a chunk of several Greek words stands once, at its first; a chunk with no Greek follows the chunk before it in English', () => {
    expect(textIn(verse, chunkOrder(verse, 'greek'))).toBe('God. was indeed the Word');
  });

  it('a chunk with no Greek at the start of the English stays first', () => {
    const lead: Verse = {
      n: 1,
      g: [word('θεὸς', 'θεός', 3), word('ἦν', 'εἰμί', 2), word('ὁ', 'ὁ', 1), word('λόγος', 'λόγος', 1)],
      e: [{ t: 'And', g: [] }, { t: 'the Word', g: [2, 3] }, { t: 'was', g: [1] }, { t: 'God.', g: [0] }],
    };
    expect(textIn(lead, chunkOrder(lead, 'greek'))).toBe('And God. was the Word');
  });
});

describe('wovenInOrder', () => {
  it('keeps each chunk\'s weave by its own index and carries the order the Reader draws them in', () => {
    const plain = weaveVerse(verse1, { solid: new Set(['ἐγώ']) });
    const greek = wovenInOrder(verse1, plain, 'greek');
    expect(greek.order).toEqual(chunkOrder(verse1, 'greek'));
    expect(greek[0]?.words.map((w) => w.t)).toEqual(['μου']);
    expect(wovenInOrder(verse1, plain, 'english').order).toBeUndefined();
  });
});

describe('read aloud follows the order shown', () => {
  it('runsOf reads a verse woven in Greek order in that order', () => {
    const woven = wovenInOrder(verse1, weaveVerse(verse1, { solid: new Set(['ἐγώ']) }), 'greek');
    expect(runsOf(verse1, 'english', woven).map((r) => r.text)).toEqual(['little children,', 'μου', 'these things I am writing to you so that you will not sin. But if anyone does sin, an advocate we have before the Father — Jesus Christ, the Righteous One.']);
  });
});
