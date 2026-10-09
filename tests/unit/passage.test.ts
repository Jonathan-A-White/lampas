import { describe, expect, it } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { passageAt, passageVerse, passagesOf, unitId, unitName, unitReference } from '../../src/data/passage';
import { readerHash, readerOf } from '../../src/nav/route';
import { passageUrl } from '../../src/nav/links';

const verse = (n: number, h?: string): Verse => ({
  n,
  ...(h ? { h } : {}),
  g: [{ t: `g${n}`, tr: '', s: 'G1', l: 'l', p: '' }],
  e: [{ t: `e${n}`, g: [0] }],
});

const CHAPTER = [verse(1, 'One'), verse(2), verse(3), verse(4, 'Two'), verse(5)];

describe('the passages of a chapter', () => {
  it('starts one at each verse with a heading and runs to the verse before the next', () => {
    expect(passagesOf(CHAPTER).map((p) => [p.heading, p.first, p.last])).toEqual([
      ['One', 1, 3],
      ['Two', 4, 5],
    ]);
  });

  it('leaves the verses before the first heading in no passage', () => {
    const verses = [verse(1), verse(2, 'Late'), verse(3)];
    expect(passagesOf(verses).map((p) => [p.first, p.last])).toEqual([[2, 3]]);
  });

  it('finds the passage that starts at a verse, and none for a verse that starts none', () => {
    expect(passageAt(CHAPTER, 4)?.heading).toBe('Two');
    expect(passageAt(CHAPTER, 2)).toBeUndefined();
  });

  it('is one Verse with the first verse as n, the last as to, and every word in order', () => {
    const one = passageVerse(passagesOf(CHAPTER)[0]);
    expect(one).toMatchObject({ n: 1, to: 3, h: 'One' });
    expect(one.g.map((w) => w.t)).toEqual(['g1', 'g2', 'g3']);
    expect(one.e.map((c) => c.t)).toEqual(['e1', 'e2', 'e3']);
  });

  it('names a verse and a passage the way the view says them', () => {
    const passage = passageVerse(passagesOf(CHAPTER)[0]);
    expect([unitId(CHAPTER[1]), unitName(CHAPTER[1]), unitReference('Romans 8', CHAPTER[1])]).toEqual(['2', 'verse 2', 'Romans 8:2']);
    expect([unitId(passage), unitName(passage), unitReference('Romans 8', passage)]).toEqual(['1-3', 'verses 1-3', 'Romans 8:1-3']);
  });
});

describe('the passage in the address and in a link', () => {
  it('carries the first verse of the passage as p', () => {
    expect(readerOf('#/?c=8&view=english&weave=off&p=12')).toEqual({ chapter: 8, view: 'english', weave: 'off', passage: 12 });
    expect(readerHash({ chapter: 8, view: 'english', weave: 'off', passage: 12 })).toBe('#/?c=8&view=english&weave=off&p=12');
    expect(readerOf('#/?c=8&p=0').passage).toBeUndefined();
  });

  it('writes the passage link as a verse range', () => {
    expect(passageUrl('rom', 8, 1, 11)).toMatch(/\/#\/\?ref=Rom\.8\.1-11$/);
  });
});
