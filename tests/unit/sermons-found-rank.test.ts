// The Sermons sheet's search ranks what it found by nearness to the open place (mw-qtu3zvz.66, PROVISIONAL tier order, the Governor to confirm): a sermon on the open verse, then one on its pericope, then one on its
// chapter, then one on a theme of the verse, then the rest in the service's order; within a tier the old order stands.
import { describe, expect, it } from 'vitest';
import { foundTier, rankHits, type FoundRankContext } from '../../src/sermons/foundRank';
import type { ServiceHit } from '../../src/services/sermons';

const sermon = (id: string, title: string, ref: string | null): ServiceHit => ({ kind: 'sermon', source: 's', id, title, ref, url: `https://x.test/${id}`, rank: 1 });
const theme = (source: string, id: string, title: string): ServiceHit => ({ kind: 'theme', source, id, title, ref: null, url: null, rank: 1 });
const ids = (hits: ServiceHit[]): string[] => hits.map((h) => h.id);

// 2 Peter 3:14, under the heading that runs from 3:14 to 3:18 (his pericope), with a theme of the verse
const context: FoundRankContext = {
  place: { book: '2pe', chapter: 3, from: 14, to: 14 },
  pericope: { first: 11, last: 18 },
  themes: new Set(['thompson:diligence']),
  themeSermons: new Set(),
};

describe('rankHits: a match near the open place comes before a general one', () => {
  const general = sermon('g1', 'College Education for Men of Business', null);
  const general2 = sermon('g2', 'The Gospel for Busy People, Part 1', '1Cor.1.1');
  const chapterOnly = sermon('c1', 'Business of the Day', '2Pet.3.3');
  const pericopeOnly = sermon('p1', 'Business Until He Comes', '2Pet.3.11-2Pet.3.12');
  const onVerse = sermon('v1', 'Business in Peace', '2Pet.3.14');
  const diligence = theme('thompson', 'diligence', 'Business Life: Business Virtues: Diligence');
  const otherTheme = theme('thompson', 'trade', 'Trade');

  it('puts the verse, then the pericope, then the chapter, then a theme of the verse, then the rest', () => {
    const hits = [general, general2, diligence, otherTheme, chapterOnly, pericopeOnly, onVerse];
    expect(ids(rankHits(hits, context))).toEqual(['v1', 'p1', 'c1', 'diligence', 'g1', 'g2', 'trade']);
  });

  it('keeps the old order within a tier', () => {
    const a = sermon('a', 'A', '2Pet.3.14');
    const b = sermon('b', 'B', '2Pet.3.13-2Pet.3.15');
    const c = sermon('c', 'C', '2Pet.3.1');
    const d = sermon('d', 'D', '2Pet.3.2');
    expect(ids(rankHits([d, c, b, a], context))).toEqual(['b', 'a', 'd', 'c']);
  });

  it('counts a sermon its theme lists as on a theme of the verse', () => {
    const viaTheme = sermon('t1', 'Via a theme', '1Cor.1.1');
    const ranked = rankHits([general, viaTheme], { ...context, themeSermons: new Set(['s:t1']) });
    expect(ids(ranked)).toEqual(['t1', 'g1']);
  });

  it('gives today\'s order unchanged for a query that matches nothing near the verse', () => {
    const hits = [general, general2, otherTheme, sermon('x', 'Elsewhere', 'Rom.5.8')];
    expect(rankHits(hits, context)).toEqual(hits);
  });

  it('has no verse or pericope tier for a whole chapter, and sorts its sermons as the chapter', () => {
    const whole: FoundRankContext = { ...context, place: { book: '2pe', chapter: 3 }, pericope: undefined };
    expect(foundTier(onVerse, whole)).toBe(foundTier(chapterOnly, whole));
    expect(ids(rankHits([general, chapterOnly], whole))).toEqual(['c1', 'g1']);
  });

  it('reads a passage place: a sermon on any of its verses is on the verse', () => {
    const passage: FoundRankContext = { ...context, place: { book: '2pe', chapter: 3, from: 14, to: 16 } };
    expect(foundTier(sermon('z', 'Z', '2Pet.3.16'), passage)).toBe(foundTier(onVerse, passage));
    expect(foundTier(sermon('y', 'Y', '2Pet.3.17'), passage)).toBeGreaterThan(foundTier(onVerse, passage));
  });

  it('does not take another book\'s same chapter number for the chapter', () => {
    expect(foundTier(sermon('o', 'O', '1Pet.3.14'), context)).toBe(foundTier(general, context));
  });

  it('knows a pericope it could not read as none', () => {
    expect(foundTier(pericopeOnly, { ...context, pericope: undefined })).toBe(foundTier(chapterOnly, context));
  });

  it('does not throw on a reference it cannot read', () => {
    expect(foundTier(sermon('b', 'Bad', 'Nonsense.1.1'), context)).toBe(foundTier(general, context));
  });
});
