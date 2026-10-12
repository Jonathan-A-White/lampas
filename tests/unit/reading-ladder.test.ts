// The reading ladder's place (mw-neuq78.4, src/data/readingLadder.ts): the first verse he has not read well, a skipped verse coming back after five others.
import { describe, expect, it } from 'vitest';
import { ladderPlace, positionOf, refParts, SKIP_GAP, type LadderEntry } from '../../src/data/readingLadder';

const entry = (ref: string): LadderEntry => ({ ref, score: 1, why: [] });
const list = ['a.1.1', 'a.1.2', 'a.1.3', 'a.1.4', 'a.1.5', 'a.1.6', 'a.1.7', 'a.1.8', 'a.1.9'].map(entry);
const well = (...refs: string[]): Map<string, number> => new Map(refs.map((ref, i) => [ref, 1000 + i * 10]));

describe('refParts', () => {
  it('reads a ladder ref into the book code, chapter and verse', () => {
    expect(refParts('1th.5.16')).toEqual({ book: '1th', chapter: 5, verse: 16 });
    expect(refParts('jhn.11.35')).toEqual({ book: 'jhn', chapter: 11, verse: 35 });
  });

  it('refuses anything else', () => {
    expect(refParts('rom.8')).toBeUndefined();
    expect(refParts('rom.8.1-11')).toBeUndefined();
    expect(refParts('')).toBeUndefined();
  });
});

describe('positionOf', () => {
  it('counts from 1 and is 0 for a verse that is not on the list', () => {
    expect(positionOf(list, 'a.1.1')).toBe(1);
    expect(positionOf(list, 'a.1.3')).toBe(3);
    expect(positionOf(list, 'b.9.9')).toBe(0);
  });
});

describe('ladderPlace', () => {
  it('is the first verse of the list when nothing is read', () => {
    expect(ladderPlace(list, new Map(), [])).toBe('a.1.1');
  });

  it('moves past the verses read well', () => {
    expect(ladderPlace(list, well('a.1.1'), [])).toBe('a.1.2');
    expect(ladderPlace(list, well('a.1.1', 'a.1.2'), [])).toBe('a.1.3');
  });

  it('is the first verse not read well even when a later one was read well', () => {
    expect(ladderPlace(list, well('a.1.2'), [])).toBe('a.1.1');
  });

  it('passes over a skipped verse', () => {
    expect(ladderPlace(list, new Map(), [{ ref: 'a.1.1', at: 500 }])).toBe('a.1.2');
  });

  it('brings a skipped verse back once SKIP_GAP other verses were read well after the skip', () => {
    expect(SKIP_GAP).toBe(5);
    const skipped = [{ ref: 'a.1.1', at: 500 }];
    // four read well after the skip: still not back
    expect(ladderPlace(list, well('a.1.2', 'a.1.3', 'a.1.4', 'a.1.5'), skipped)).toBe('a.1.6');
    // the fifth brings it back
    expect(ladderPlace(list, well('a.1.2', 'a.1.3', 'a.1.4', 'a.1.5', 'a.1.6'), skipped)).toBe('a.1.1');
  });

  it('does not count verses read well before the skip', () => {
    const wellBefore = new Map([['a.1.2', 100], ['a.1.3', 110], ['a.1.4', 120], ['a.1.5', 130], ['a.1.6', 140]]);
    expect(ladderPlace(list, wellBefore, [{ ref: 'a.1.1', at: 500 }])).toBe('a.1.7');
  });

  it('forgets a skip once the verse is read well', () => {
    const wellRead = new Map([['a.1.1', 900]]);
    expect(ladderPlace(list, wellRead, [{ ref: 'a.1.1', at: 500 }])).toBe('a.1.2');
  });

  it('brings the oldest returned skip back first', () => {
    const skipped = [{ ref: 'a.1.2', at: 400 }, { ref: 'a.1.1', at: 300 }];
    const refs = ['a.1.3', 'a.1.4', 'a.1.5', 'a.1.6', 'a.1.7'];
    expect(ladderPlace(list, well(...refs), skipped)).toBe('a.1.1');
  });

  it('goes back to a skipped verse when nothing else is left', () => {
    const all = new Map(list.slice(1).map((e, i) => [e.ref, 600 + i]));
    expect(ladderPlace(list, all, [{ ref: 'a.1.1', at: 500 }])).toBe('a.1.1');
  });

  it('is null when every verse is read well', () => {
    expect(ladderPlace(list, new Map(list.map((e) => [e.ref, 1])), [])).toBeNull();
  });
});
