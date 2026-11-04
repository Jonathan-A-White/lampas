// The finder of Bible references in free text (src/nav/refsInText.ts, mw-s1dc0n.1): what Share to Lampas lists as links.
import { describe, expect, it } from 'vitest';
import { findReferences, groupedByBook, listReferences, referenceSpans } from '../../src/nav/refsInText';
import { referenceUrl } from '../../src/nav/links';

const refs = (text: string) => findReferences(text).map((r) => [r.printed, r.ref, r.lastVerse]);

describe('findReferences', () => {
  it("finds the Kindle page's reference and ignores the translation tag", () => {
    expect(refs('over every living thing that moves on the earth” (Gen. 1:28 ESV). Consider')).toEqual([['Gen. 1:28', 'Gen.1.28', undefined]]);
  });

  it('finds a range, a numbered book and a chapter alone', () => {
    expect(refs('see Rom 8:28-30 and 1 John 1:1; Ps 23')).toEqual([
      ['Rom 8:28-30', 'Rom.8.28', 30],
      ['1 John 1:1', '1John.1.1', undefined],
      ['Ps 23', 'Ps.23', undefined],
    ]);
  });

  it('reads abbreviations with or without a dot, full names and tags', () => {
    expect(refs('1 Cor. 13:4 (NIV), Romans 8:1 KJV, Jn 3:16 and Song of Solomon 2:1')).toEqual([
      ['1 Cor. 13:4', '1Cor.13.4', undefined],
      ['Romans 8:1', 'Rom.8.1', undefined],
      ['Jn 3:16', 'John.3.16', undefined],
      ['Song of Solomon 2:1', 'Song.2.1', undefined],
    ]);
  });

  it('reads a list of verses as one reference each', () => {
    expect(refs('Rom 8:28, 31 is the thing')).toEqual([
      ['Rom 8:28', 'Rom.8.28', undefined],
      ['Rom 8:31', 'Rom.8.31', undefined],
    ]);
  });

  it('finds a reference after a number that is no book', () => {
    expect(refs('In 2 Cor 5:17 we read')).toEqual([['2 Cor 5:17', '2Cor.5.17', undefined]]);
  });

  it('finds none where a book name is only a word, or a name is not a book', () => {
    expect(refs('Mark my words, 3:16 was late')).toEqual([]);
    expect(refs('Hezekiah 3:16 and Barnabas 2:4')).toEqual([]);
    expect(refs('It is 5:30 and this is 5 people')).toEqual([]);
  });
});

describe('listReferences', () => {
  const text = 'Rom 8:28 ... Gen 1:28 ... Rom 8:28 ... Rom 1:16';
  const shown = (order: 'page' | 'bible') => listReferences(findReferences(text), order).map((r) => `${r.printed}${r.count > 1 ? ` ×${r.count}` : ''}`);

  it('keeps the order of the page, a repeat at its first place', () => {
    expect(shown('page')).toEqual(['Rom 8:28 ×2', 'Gen 1:28', 'Rom 1:16']);
  });

  it('puts them in Bible order, by book, chapter and verse', () => {
    expect(shown('bible')).toEqual(['Gen 1:28', 'Rom 1:16', 'Rom 8:28 ×2']);
  });

  it('groups Bible order under each book', () => {
    const groups = groupedByBook(listReferences(findReferences(text), 'bible'));
    expect(groups.map((g) => [g.name, g.refs.length])).toEqual([['Genesis', 1], ['Romans', 2]]);
  });

  it('links a range at its first verse', () => {
    const [one] = findReferences('Rom 8:28-30');
    expect(referenceUrl(one.book, one.chapter, one.verse)).toBe('https://lampas.allmymind.org/#/?ref=Rom.8.28');
  });
});

describe('referenceSpans (the blog tagger, mw-5r3p30.1043)', () => {
  const spans = (text: string, semicolons = true) => referenceSpans(text, { semicolons }).map((r) => [text.slice(r.start, r.end), r.ref, r.lastVerse]);

  it('says where each reference stands, a list item and a range included', () => {
    expect(spans('Read John 5:24-29, 31 and Rom 8.')).toEqual([
      ['John 5:24-29', 'John.5.24', 29],
      ['31', 'John.5.31', undefined],
      ['Rom 8', 'Rom.8', undefined],
    ]);
  });

  it("goes on with the same book after a ';' only when asked", () => {
    expect(spans('Romans 8:1; 10:9-10, 13')).toEqual([
      ['Romans 8:1', 'Rom.8.1', undefined],
      ['10:9-10', 'Rom.10.9', 10],
      ['13', 'Rom.10.13', undefined],
    ]);
    expect(spans('Romans 8:1; 10:9-10', false)).toEqual([['Romans 8:1', 'Rom.8.1', undefined]]);
    expect(spans('Romans 8:1; 99:9')).toEqual([['Romans 8:1', 'Rom.8.1', undefined]]);
  });

  it('finds what findReferences finds, as before', () => {
    const text = 'Gen. 1:28 ESV, Rom 8:28, 31 and Ps 23';
    expect(findReferences(text).map((r) => Object.keys(r).sort())).toEqual(referenceSpans(text).map((r) => Object.keys(r).filter((k) => k !== 'start' && k !== 'end').sort()));
    expect(findReferences(text).map((r) => r.ref)).toEqual(referenceSpans(text).map((r) => r.ref));
  });
});
