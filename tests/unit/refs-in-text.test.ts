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

describe('a numbered book after a verse and a comma (mw-5r3p30.1045)', () => {
  const pairs = (text: string, semicolons = false) => referenceSpans(text, { semicolons }).map((r) => [text.slice(r.start, r.end), r.ref]);

  it('reads the second reference whole, not as a verse of the first book', () => {
    expect(refs('Rom 8:1, 2 Cor 5:17')).toEqual([['Rom 8:1', 'Rom.8.1', undefined], ['2 Cor 5:17', '2Cor.5.17', undefined]]);
    expect(refs('See John 3:16, 1 John 4:8')).toEqual([['John 3:16', 'John.3.16', undefined], ['1 John 4:8', '1John.4.8', undefined]]);
    expect(refs('Gen 1:1, 2 Kings 2:11')).toEqual([['Gen 1:1', 'Gen.1.1', undefined], ['2 Kings 2:11', '2Kgs.2.11', undefined]]);
    // 3 John has one chapter, so '3 John 4' is no reference we list, but it is no verse of John and no 'John 4' either
    expect(refs('John 3:16, 3 John 4')).toEqual([['John 3:16', 'John.3.16', undefined]]);
    expect(refs('Song of Solomon 2:4, 2 Tim 3:16-17')).toEqual([['Song of Solomon 2:4', 'Song.2.4', undefined], ['2 Tim 3:16-17', '2Tim.3.16', 17]]);
  });

  it('keeps the verses of the list before the book, and a plain list as it was', () => {
    expect(pairs('Rom 8:1, 3, 2 Cor 5:17')).toEqual([['Rom 8:1', 'Rom.8.1'], ['3', 'Rom.8.3'], ['2 Cor 5:17', '2Cor.5.17']]);
    expect(pairs('John 5:24, 28')).toEqual([['John 5:24', 'John.5.24'], ['28', 'John.5.28']]);
    expect(pairs('John 5:24, 2 are good')).toEqual([['John 5:24', 'John.5.24'], ['2', 'John.5.2']]);
    expect(pairs('Romans 8:1; 10:9, 2 Cor 5:17', true)).toEqual([['Romans 8:1', 'Rom.8.1'], ['10:9', 'Rom.10.9'], ['2 Cor 5:17', '2Cor.5.17']]);
  });

  it('reads First, Second, Third and I, II, III as the number of the book', () => {
    expect(refs('First John 5:25')).toEqual([['First John 5:25', '1John.5.25', undefined]]);
    expect(refs('I John 5:25')).toEqual([['I John 5:25', '1John.5.25', undefined]]);
    expect(refs('II Cor 5:17 and Second Peter 1:4')).toEqual([['II Cor 5:17', '2Cor.5.17', undefined], ['Second Peter 1:4', '2Pet.1.4', undefined]]);
    expect(refs('John 5:25')).toEqual([['John 5:25', 'John.5.25', undefined]]);
  });

  it("lists the same on the Share screen (findReferences and listReferences, which ShareReferences draws), with no ';' reading", () => {
    const shared = (text: string) => listReferences(findReferences(text), 'page').map((r) => r.ref);
    expect(shared('Rom 8:1, 2 Cor 5:17')).toEqual(['Rom.8.1', '2Cor.5.17']);
    expect(shared('See John 3:16, 1 John 4:8')).toEqual(['John.3.16', '1John.4.8']);
    expect(shared('Gen 1:1, 2 Kings 2:11')).toEqual(['Gen.1.1', '2Kgs.2.11']);
    expect(shared('John 5:24, 28')).toEqual(['John.5.24', 'John.5.28']);
    expect(shared('First John 5:25, I John 5:25')).toEqual(['1John.5.25']);
  });

  // every numbered book, after ', ' following a verse of another book, is read whole (a sweep, so a book left out of the check shows)
  const NUMBERED: [string, string, string][] = [
    ['1 Sam', '1Sam', '1 Samuel'], ['2 Sam', '2Sam', '2 Samuel'], ['1 Kings', '1Kgs', '1 Kgs'], ['2 Kings', '2Kgs', '2 Kgs'], ['1 Chr', '1Chr', '1 Chronicles'],
    ['2 Chr', '2Chr', '2 Chronicles'], ['1 Cor', '1Cor', '1 Corinthians'], ['2 Cor', '2Cor', '2 Corinthians'], ['1 Thess', '1Thess', '1 Thessalonians'],
    ['2 Thess', '2Thess', '2 Thessalonians'], ['1 Tim', '1Tim', '1 Timothy'], ['2 Tim', '2Tim', '2 Timothy'], ['1 Pet', '1Pet', '1 Peter'], ['2 Pet', '2Pet', '2 Peter'],
    ['1 John', '1John', '1 Jn'], ['2 John', '2John', '2 Jn'], ['3 John', '3John', '3 Jn'],
  ];
  it.each(NUMBERED)('%s after ", " following a verse is that book, by either name', (short, code, long) => {
    for (const name of [short, long]) {
      const text = `Rom 8:1, ${name} 1:2`;
      const found = referenceSpans(text).map((r) => [text.slice(r.start, r.end), r.ref]);
      expect(found, text).toEqual([['Rom 8:1', 'Rom.8.1'], [`${name} 1:2`, `${code}.1.2`]]);
    }
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

describe('a range that crosses a chapter, runs backwards or names verse 0 (mw-5r3p30.1046)', () => {
  const spans = (text: string, semicolons = true) => referenceSpans(text, { semicolons }).map((r) => [text.slice(r.start, r.end), r.ref, r.lastVerse]);

  it("ends 'John 3:16-4:3' after '3:16', with no range 'John 3:16-4'", () => {
    expect(spans('See John 3:16-4:3 today')).toEqual([['John 3:16', 'John.3.16', undefined]]);
    expect(spans('John 5:25-6:2')).toEqual([['John 5:25', 'John.5.25', undefined]]);
    expect(spans('John 5:25–6:2')).toEqual([['John 5:25', 'John.5.25', undefined]]);
    expect(spans('Romans 8:1; 10:9-11:2')).toEqual([['Romans 8:1', 'Rom.8.1', undefined], ['10:9', 'Rom.10.9', undefined]]);
    expect(spans('John 5:24, 28-6:2')).toEqual([['John 5:24', 'John.5.24', undefined], ['28', 'John.5.28', undefined]]);
  });

  it('makes no reversed range', () => {
    expect(spans('John 5:25-24')).toEqual([['John 5:25', 'John.5.25', undefined]]);
    expect(spans('John 5:25-25')).toEqual([['John 5:25', 'John.5.25', undefined]]);
    expect(spans('John 5:24, 29-28')).toEqual([['John 5:24', 'John.5.24', undefined], ['29', 'John.5.29', undefined]]);
  });

  it('makes no reference of verse 0', () => {
    expect(spans('John 5:0')).toEqual([]);
    expect(spans('John 5:0-3')).toEqual([]);
    expect(spans('John 5:24, 0')).toEqual([['John 5:24', 'John.5.24', undefined]]);
    expect(spans('Romans 8:1; 10:0')).toEqual([['Romans 8:1', 'Rom.8.1', undefined]]);
  });

  it('still reads an honest range', () => {
    expect(spans('John 3:16-18')).toEqual([['John 3:16-18', 'John.3.16', 18]]);
  });

  // a sweep: whatever the text, no span has a verse below 1 or a range that does not end after its start
  const TEXTS = [
    'John 3:16-4:3', 'John 5:25-6:2', 'John 5:25-24', 'John 5:25-25', 'John 5:0', 'John 5:0-3', 'Rom 8:0, 0-2, 3-1', 'Romans 8:1; 10:0; 10:9-8', 'Gen 1:1-2:3, 5',
    'Ps 23:1-24:2', 'John 3:16–4:3', 'John 3:16 - 4 : 3', 'Rom 8:1, 3-4:2', 'Rom 8:28-30, 31-32', 'John 5:24-29, 31', '1 Kings 17:17-24; 18:1-2', 'John 11',
  ];
  it.each(TEXTS)('%s: every span has a verse of at least 1 and a lastVerse after it', (text) => {
    for (const semicolons of [false, true]) {
      for (const r of referenceSpans(text, { semicolons })) {
        if (r.verse !== undefined) expect(r.verse, `${text} -> ${r.printed}`).toBeGreaterThanOrEqual(1);
        if (r.lastVerse !== undefined) expect(r.lastVerse, `${text} -> ${r.printed}`).toBeGreaterThan(r.verse as number);
        expect(text.slice(r.start, r.end), text).not.toMatch(/[-–]\s*$/);
      }
    }
  });
});

describe('a book and a bare number in plain English (mw-5r3p30.1047)', () => {
  const spans = (text: string) => referenceSpans(text, { semicolons: true }).map((r) => [text.slice(r.start, r.end), r.ref]);

  it('makes no chapter of a number that a plural time word or "of them" follows', () => {
    expect(spans('I waited Mark 5 times')).toEqual([]);
    expect(spans('about Job 3 months ago')).toEqual([]);
    expect(spans('Acts 2 of them')).toEqual([]);
    expect(spans('Am 5 minutes late')).toEqual([]);
    expect(spans('Job 3 days, Mark 5 years, John 3 hours, Luke 2 weeks, Ruth 2 seconds')).toEqual([]);
    expect(spans('Job 3-4 months')).toEqual([]);
  });

  it('still links a chapter alone, at the end of a sentence or before other words', () => {
    expect(spans('Mark 5')).toEqual([['Mark 5', 'Mark.5']]);
    expect(spans('Job 3.')).toEqual([['Job 3', 'Job.3']]);
    expect(spans('Job 3 is long; Mark 5 is a story')).toEqual([['Job 3', 'Job.3'], ['Mark 5', 'Mark.5']]);
    expect(spans('Mark 5 and Job 3 alone')).toEqual([['Mark 5', 'Mark.5'], ['Job 3', 'Job.3']]);
  });

  it('keeps a verse reference even when a time word follows it', () => {
    expect(spans('Mark 5:3 times')).toEqual([['Mark 5:3', 'Mark.5.3']]);
  });

  it('reads a chapter range whole, at its first chapter', () => {
    expect(spans('Matthew 5-7')).toEqual([['Matthew 5-7', 'Matt.5']]);
    expect(spans('Read Matthew 5–7, then more')).toEqual([['Matthew 5–7', 'Matt.5']]);
    expect(spans('Psalms 23 - 24.')).toEqual([['Psalms 23 - 24', 'Ps.23']]);
  });

  it('reads no chapter range that runs backwards, past the book or into a verse', () => {
    expect(spans('Matthew 7-5')).toEqual([['Matthew 7', 'Matt.7']]);
    expect(spans('Matthew 5-99')).toEqual([['Matthew 5', 'Matt.5']]);
    expect(spans('Matthew 5-7:3')).toEqual([['Matthew 5', 'Matt.5']]);
  });
});
