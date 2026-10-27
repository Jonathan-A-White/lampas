// The Logos Atlas's passages and books (src/maps/logosRef.ts, mw-zbjgn3r.7): Logos's bible datatype numbers for our books, the passage forms the atlas writes, and the maps that cover a reference.
import { describe, expect, it } from 'vitest';
import data from '../../src/maps/data/logosatlas.json';
import { mapsCovering, spanHolds, toLogosBook, type LogosAtlasIndex } from '../../src/maps/logosRef';
import { BOOKS } from '../../src/data/books';

const index = data as LogosAtlasIndex;
const ids = (ref: Parameters<typeof mapsCovering>[0]): string[] => mapsCovering(ref, index).map((m) => m.id);

describe('toLogosBook', () => {
  it('numbers the Old Testament 1 to 39 and the New Testament from 61 (40 to 60 are unused)', () => {
    expect(toLogosBook('gen')).toBe(1);
    expect(toLogosBook('jon')).toBe(32);
    expect(toLogosBook('mal')).toBe(39);
    expect(toLogosBook('mat')).toBe(61);
    expect(toLogosBook('mrk')).toBe(62);
    expect(toLogosBook('luk')).toBe(63);
    expect(toLogosBook('jhn')).toBe(64);
    expect(toLogosBook('act')).toBe(65);
    expect(toLogosBook('rom')).toBe(66);
    expect(toLogosBook('heb')).toBe(79);
    expect(toLogosBook('rev')).toBe(87);
    expect(toLogosBook('psa')).toBe(19);
  });

  it('answers undefined for a code that is no book, and never 40 to 60', () => {
    expect(toLogosBook('xyz')).toBeUndefined();
    const numbers = BOOKS.map((b) => toLogosBook(b.code) as number);
    expect(numbers).toHaveLength(66);
    expect(new Set(numbers).size).toBe(66);
    for (const n of numbers) expect(n < 40 || n > 60).toBe(true);
  });
});

describe('spanHolds', () => {
  const gen = (chapter: number, from?: number, to?: number) => ({ book: 'gen', chapter, from, to });

  it('reads bible.B.C.V as one verse', () => {
    expect(spanHolds('bible.1.4.25', gen(4, 25))).toBe(true);
    expect(spanHolds('bible.1.4.25', gen(4, 24))).toBe(false);
    expect(spanHolds('bible.1.4.25', gen(5, 25))).toBe(false);
    expect(spanHolds('bible.2.4.25', gen(4, 25))).toBe(false);
  });

  it('reads bible.B.C.V-B.C.V across chapters', () => {
    expect(spanHolds('bible.1.1.1-1.2.3', gen(1, 31))).toBe(true);
    expect(spanHolds('bible.1.1.1-1.2.3', gen(2, 3))).toBe(true);
    expect(spanHolds('bible.1.1.1-1.2.3', gen(2, 4))).toBe(false);
    expect(spanHolds('bible.1.1.1-1.2.3', gen(1, 0 + 1))).toBe(true);
  });

  it('reads bible.B.C.V-C.V and bible.B.C.V-V', () => {
    expect(spanHolds('bible.1.1.1-2.3', gen(2, 2))).toBe(true);
    expect(spanHolds('bible.1.1.1-2.3', gen(2, 4))).toBe(false);
    expect(spanHolds('bible.1.11.1-9', gen(11, 9))).toBe(true);
    expect(spanHolds('bible.1.11.1-9', gen(11, 10))).toBe(false);
  });

  it('reads bible.B.C as a whole chapter', () => {
    expect(spanHolds('bible.1.11', gen(11, 40))).toBe(true);
    expect(spanHolds('bible.1.11', gen(12, 1))).toBe(false);
  });

  it("counts a Psalm's title line as verse 1", () => {
    const psa = (chapter: number, from?: number) => ({ book: 'psa', chapter, from });
    expect(spanHolds('bible.19.3.title', psa(3, 1))).toBe(true);
    expect(spanHolds('bible.19.3.title', psa(3, 2))).toBe(false);
  });

  it('holds a passage of verses when any of them is in the span, and a chapter when any verse of it is', () => {
    expect(spanHolds('bible.1.11.4', gen(11, 1, 9))).toBe(true);
    expect(spanHolds('bible.1.11.4', gen(11, 5, 9))).toBe(false);
    expect(spanHolds('bible.1.11.4', gen(11))).toBe(true);
    expect(spanHolds('bible.1.11.4', gen(10))).toBe(false);
  });

  it('holds nothing for a form it does not know', () => {
    expect(spanHolds('bible.nope', gen(1, 1))).toBe(false);
    expect(spanHolds('', gen(1, 1))).toBe(false);
  });
});

describe('mapsCovering', () => {
  it('puts the narrow story map before the period map: Jonah 1:1', () => {
    expect(ids({ book: 'jon', chapter: 1, from: 1 })).toEqual(['JONAHSTRAVELS-EN', 'BIBLICALWORLDDIVIDEDKINGDOM-EN']);
  });

  it('Genesis 11:4: the Tower of Babel, then the Pre-patriarchal map', () => {
    expect(ids({ book: 'gen', chapter: 11, from: 4 })).toEqual(['THETOWEROFBABEL-EN', 'BIBLICALWORLDPREPATRIARCHALPERIOD-EN']);
  });

  it('Genesis 10:19 is covered by no map', () => {
    expect(ids({ book: 'gen', chapter: 10, from: 19 })).toEqual([]);
  });

  it("looks Matthew up under Logos's book 61", () => {
    expect(ids({ book: 'mat', chapter: 12, from: 41 })).toEqual(['BIBLICALWORLDLIFEOFJESUS-EN']);
  });

  it('answers a whole chapter by the maps that cover any of its verses, narrowest first', () => {
    expect(ids({ book: 'jon', chapter: 1 })[0]).toBe('JONAHSTRAVELS-EN');
    expect(ids({ book: 'gen', chapter: 10 })).toEqual([]);
  });

  it('answers nothing for a code that is no book', () => {
    expect(ids({ book: 'xyz', chapter: 1, from: 1 })).toEqual([]);
  });
});
