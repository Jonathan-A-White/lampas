// tests/unit/memorize-pieces.test.ts — how Memorize cuts a long passage into pieces (src/memorize/pieces.ts, docs/layout/memorize.md 'Pieces', mw-5r3p30.1205): at the units it knows
// (the Ten Commandments one by one), else at the Berean paragraphs of the chapter, else a fixed number of verses; a single verse or a short passage is one piece.
import { beforeEach, describe, expect, it } from 'vitest';
import { PIECE_VERSES, pieceHeading, piecesOf, SHORT_PASSAGE } from '../../src/memorize/pieces';
import { versesOf } from '../../src/memorize/refs';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(() => {
  stubChapterFetch();
});

/** Verses numbered `from`..`to`, the ones in `starts` beginning a paragraph. */
const run = (from: number, to: number, starts: number[] = []) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ n: from + i, ...(starts.includes(from + i) ? { p: 1 as const } : {}) }));
const numbers = (pieces: { n: number }[][]): number[][] => pieces.map((piece) => piece.map((v) => v.n));
const span = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('a passage the cutter knows: the Ten Commandments', () => {
  it('Exodus 20:1-17 is the preface and one piece per commandment', async () => {
    const found = (await versesOf('Exod.20.1-17'))!;
    expect(numbers(piecesOf(found.book, found.chapter, found.verses))).toEqual([[1, 2], [3], [4, 5, 6], [7], span(8, 11), [12], [13], [14], [15], [16], [17]]);
  });

  it('Deuteronomy 5:6-21 is cut the same way', async () => {
    const found = (await versesOf('Deut.5.6-21'))!;
    expect(numbers(piecesOf(found.book, found.chapter, found.verses))).toEqual([[6], span(7, 10), [11], span(12, 15), [16], [17], [18], [19], [20], [21]]);
  });

  it('a range inside it keeps the commandments it has, a short one is one piece', async () => {
    const six = (await versesOf('Exod.20.12-17'))!;
    expect(numbers(piecesOf(six.book, six.chapter, six.verses))).toEqual([[12], [13], [14], [15], [16], [17]]);
    const fourth = (await versesOf('Exod.20.8-11'))!;
    expect(numbers(piecesOf(fourth.book, fourth.chapter, fourth.verses))).toEqual([span(8, 11)]);
  });
});

describe('a long passage the cutter has no unit for', () => {
  it('with no break it knows falls back to pieces of a fixed number of verses, as even as they go', () => {
    const verses = run(1, 13);
    const pieces = numbers(piecesOf('xyz', 1, verses));
    expect(pieces.flat()).toEqual(span(1, 13));
    expect(pieces).toEqual([span(1, 4), span(5, 7), span(8, 10), span(11, 13)]);
    for (const piece of pieces) expect(piece.length).toBeLessThanOrEqual(PIECE_VERSES);
  });

  it('a run of 8 is two pieces of 4', () => {
    expect(numbers(piecesOf('xyz', 1, run(1, 8)))).toEqual([span(1, 4), span(5, 8)]);
  });

  it('breaks where the chapter starts a paragraph, a paragraph too long is cut to the fixed count and one too short joins its neighbour', () => {
    // paragraphs 1-3, 4, 5-6, 7-16: the lone verse 4 joins the next, the ten-verse paragraph is cut in three
    const pieces = numbers(piecesOf('xyz', 1, run(1, 16, [4, 5, 7])));
    expect(pieces).toEqual([span(1, 3), span(4, 6), span(7, 10), span(11, 13), span(14, 16)]);
  });

  it('Romans 8:1-17 is cut at the chapter\'s own paragraphs', async () => {
    const found = (await versesOf('Rom.8.1-17'))!;
    expect(numbers(piecesOf(found.book, found.chapter, found.verses))).toEqual([span(1, 4), span(5, 8), span(9, 11), span(12, 14), span(15, 17)]);
  });
});

describe('every other way he memorizes a long passage is cut by the same rule', () => {
  it('an Old Testament range is cut the same, Hebrew or English: Psalm 119:1-16 is its two paragraphs cut to four verses', async () => {
    const found = (await versesOf('Ps.119.1-16'))!;
    expect(numbers(piecesOf(found.book, found.chapter, found.verses))).toEqual([span(1, 4), span(5, 8), span(9, 12), span(13, 16)]);
  });

  it('a list\'s range is the same canonical reference the session opens: Exodus 20:1-17 from a list cuts as from the Verse view', async () => {
    const found = (await versesOf('Exod.20.1-17'))!;
    expect(piecesOf(found.book, found.chapter, found.verses)).toHaveLength(11);
    expect(found.heading).toBe('Exodus 20:1-17');
  });
});

describe('a short passage or a single verse is one piece, as it was', () => {
  it('one verse', async () => {
    const found = (await versesOf('Rom.8.28'))!;
    expect(numbers(piecesOf(found.book, found.chapter, found.verses))).toEqual([[28]]);
  });

  it(`up to ${SHORT_PASSAGE} verses, whatever paragraphs the chapter has`, () => {
    expect(numbers(piecesOf('xyz', 1, run(1, SHORT_PASSAGE, [2, 4])))).toEqual([span(1, SHORT_PASSAGE)]);
  });

  it('a chapter alone is its first verse: one piece', async () => {
    const found = (await versesOf('Ps.23'))!;
    expect(numbers(piecesOf(found.book, found.chapter, found.verses))).toHaveLength(1);
  });

  it('no verses is no piece', () => {
    expect(piecesOf('xyz', 1, [])).toEqual([]);
  });
});

describe('the heading of a piece', () => {
  it('names the piece\'s verses in the passage\'s own words', () => {
    expect(pieceHeading('Exodus 20:1-17', [{ n: 1 }, { n: 2 }])).toBe('Exodus 20:1-2');
    expect(pieceHeading('Exodus 20:1-17', [{ n: 3 }])).toBe('Exodus 20:3');
    expect(pieceHeading('1 John 1:1-10', [{ n: 4 }, { n: 5 }, { n: 6 }])).toBe('1 John 1:4-6');
  });
});
