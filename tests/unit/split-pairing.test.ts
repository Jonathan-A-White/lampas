// The Reader split's second text (mw-5r3p30.1130, docs/design/reader-split.md 'A text pane'): which texts a chapter can be read beside, and how a passage's verses are paired with the dock's text.
// Pure: no page, no fetch. The e2e (tests/e2e/reader-split-text.spec.ts) draws the same rows.
import { describe, expect, it } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { lampasOfDockVerse, pairVerses, passageNumbers } from '../../src/reader/split/splitPairing';
import { isSeptuagintText, noTextFor, notInText, splitTextNamed, splitTextOf, splitTextsFor, splitTextView } from '../../src/reader/split/splitTexts';

const verse = (n: number, ref?: Verse['ref'], refs?: Verse['refs']): Verse => ({ n, ...(ref === undefined ? {} : { ref }), ...(refs ? { refs } : {}), g: [], e: [] });
const psa = (chapter: number, v: number) => ({ book: 'psa', chapter, verse: v });
const labels = (rows: ReturnType<typeof pairVerses>): string[] => rows.map((r) => (r.kind === 'missing' ? `-${r.lampas}` : `${r.verse.n}${r.lampas === null ? '?' : `=${r.lampas}`}`));

describe('the texts a chapter can be read beside', () => {
  it('an Old Testament chapter with its Septuagint shipped has Hebrew, English, Septuagint · Greek and Septuagint · English, each with whose it is', () => {
    expect(splitTextsFor('gen', true).map((t) => [t.label, t.whose])).toEqual([
      ['Hebrew', 'Westminster Leningrad Codex'],
      ['English', 'Berean Standard Bible'],
      ['Septuagint · Greek', "Swete's edition"],
      ['Septuagint · English', "Brenton's translation"],
    ]);
  });
  it('an Old Testament chapter without one has the Hebrew and the English; a New Testament chapter the Greek and the Majority Standard Bible', () => {
    expect(splitTextsFor('gen', false).map((t) => t.label)).toEqual(['Hebrew', 'English']);
    expect(splitTextsFor('rom', true).map((t) => [t.label, t.whose])).toEqual([
      ['Greek', 'the Byzantine text'],
      ['English', 'Majority Standard Bible'],
    ]);
  });
  it('a kept key is read back, a damaged one is no text, and the Septuagint has no text in a New Testament book', () => {
    expect(splitTextOf('lxx-greek')).toBe('lxx-greek');
    expect(splitTextOf('')).toBeNull();
    expect(splitTextOf('latin')).toBeNull();
    expect(splitTextNamed('rom', 'lxx-greek')).toBeUndefined();
    expect(isSeptuagintText('lxx-english')).toBe(true);
  });
  it('says how each text is drawn and what a verse or a chapter it lacks says', () => {
    expect(splitTextView('hebrew', 'gen')).toEqual({ view: 'greek', source: 'hbo' });
    expect(splitTextView('lxx-english', 'gen')).toEqual({ view: 'english', source: 'grc' });
    expect(splitTextView('english', 'gen')).toEqual({ view: 'english', source: 'hbo' });
    expect(notInText('lxx-greek')).toBe('Not in the Septuagint');
    expect(noTextFor('lxx-greek', 'Romans')).toBe('No Septuagint for Romans');
  });
});

describe('the pairing of a passage verse to the dock text\'s verse', () => {
  it('a text numbered as Lampas numbers pairs verse to verse by its own number', () => {
    expect(lampasOfDockVerse(verse(15), 'gen', 14)).toEqual([15]);
    expect(labels(pairVerses([1, 2, 3], [verse(1), verse(2), verse(3)], 'gen', 14))).toEqual(['1=1', '2=2', '3=3']);
  });
  it('Greek Psalm 22 pairs with Lampas Psalm 23 by each verse\'s ref, and the one verse a Greek verse answers in another chapter is not this chapter\'s', () => {
    const greek = [1, 2, 3].map((n) => verse(n, psa(23, n)));
    expect(labels(pairVerses([1, 2, 3], greek, 'psa', 23))).toEqual(['1=1', '2=2', '3=3']);
    expect(lampasOfDockVerse(verse(5, psa(23, 5), [psa(24, 1)]), 'psa', 24)).toEqual([1]);
    expect(lampasOfDockVerse(verse(5, psa(23, 5), [psa(24, 1)]), 'psa', 23)).toEqual([5]);
    expect(lampasOfDockVerse(verse(5, 'none'), 'psa', 23)).toEqual([]);
  });
  it('a Greek verse that answers two Lampas verses covers both: no missing row for the second', () => {
    const greek = [verse(1, psa(23, 1)), verse(2, psa(23, 2), [psa(23, 3)]), verse(3, psa(23, 4))];
    expect(labels(pairVerses([1, 2, 3, 4], greek, 'psa', 23))).toEqual(['1=1', '2=2', '3=4']);
  });
  it('a passage verse with no partner gets a missing row at its place, never a blank (a synthetic chapter)', () => {
    // the Greek has no verse for Lampas 2 and 4, and ends at 5; Lampas has 7 verses
    const greek = [verse(1, psa(9, 1)), verse(2, psa(9, 3)), verse(3, psa(9, 5))];
    expect(labels(pairVerses([1, 2, 3, 4, 5, 6, 7], greek, 'psa', 9))).toEqual(['1=1', '-2', '2=3', '-4', '3=5', '-6', '-7']);
  });
  it('a dock verse with no Lampas number stays where the dock puts it, with its own number', () => {
    const greek = [verse(1, 'none'), verse(2, psa(23, 1)), verse(3, 'none'), verse(4, psa(23, 2))];
    expect(labels(pairVerses([1, 2], greek, 'psa', 23))).toEqual(['1?', '2=1', '3?', '4=2']);
  });
  it('a text with nothing for the chapter is only missing rows, in the passage\'s order', () => {
    expect(labels(pairVerses([3, 1, 2], [], 'rom', 8))).toEqual(['-1', '-2', '-3']);
  });
  it('a Septuagint passage is paired by Lampas numbers too (its verses with no Lampas verse are left out)', () => {
    const lxx = { edition: 'swete', verses: [verse(1, psa(23, 1)), verse(2, 'none'), verse(3, psa(23, 2))] };
    expect(passageNumbers(lxx)).toEqual([1, 2]);
    expect(passageNumbers({ verses: [verse(1), verse(2)] })).toEqual([1, 2]);
  });
});
