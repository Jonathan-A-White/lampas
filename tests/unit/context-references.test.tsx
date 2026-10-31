// A reference in an answer that leans on a book or chapter already named is linked, and a name across a full stop is not a reference (mw-5r3p30.927, his
// words of 2026-10-31 on 'Talk about Revelation 10': 'Revelation. 1' was one link, 'Daniel' and 'chapters 2, 7 and 10 to 12' were plain).
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Markdown } from '../../src/markdown/Markdown';
import { cardOf, referencesIn, writtenOf } from '../../src/markdown/verseLinks';

afterEach(cleanup);

/** What a text links: the characters linked and the reference each stands for. */
const linked = (text: string): [string, string][] => referencesIn(text).map((f) => [text.slice(f.start, f.end), f.as ?? f.written]);

const HIS_ANSWER =
  'Here is a top five, ordered by how much light each throws on Revelation. 1. Daniel, above all chapters 2, 7 and 10 to 12: the statue and kingdoms, the Son of Man. 2. Ezekiel, for the temple and the glory.';

describe('a name across a full stop is no reference', () => {
  it('links nothing across the full stop in his sentence', () => {
    expect(linked('on Revelation. 1. Daniel')).toEqual([]);
    expect(linked('throws on Revelation. 1. Daniel, then')).toEqual([]);
  });

  it('still links an abbreviation with its dot', () => {
    expect(linked('Rev. 1:1 opens it')).toEqual([['Rev. 1:1', 'Rev. 1:1']]);
    expect(linked('Ps. 110 and Gen. 1:28')).toEqual([
      ['Ps. 110', 'Ps. 110'],
      ['Gen. 1:28', 'Gen. 1:28'],
    ]);
  });
});

// [name of the case, the text, what is linked as [characters, reference it stands for]]
const LINKED: [string, string, [string, string][]][] = [
  ['his chapters list', 'Daniel, above all chapters 2, 7 and 10 to 12: the statue', [['2', 'Daniel 2'], ['7', 'Daniel 7'], ['10 to 12', 'Daniel 10-12']]],
  ['chapters with and', 'See Daniel; chapters 2 and 7 are the heart.', [['2', 'Daniel 2'], ['7', 'Daniel 7']]],
  ['a range in a list with a dash', 'Isaiah has chapters 40-48 and 52.', [['40-48', 'Isaiah 40-48'], ['52', 'Isaiah 52']]],
  ['a chapter after a chapter-only reference', 'Ezekiel 10 is the vision; chapter 11 follows.', [['Ezekiel 10', 'Ezekiel 10'], ['11', 'Ezekiel 11']]],
  ['chapters 10 to 12', 'Daniel 9 prays, and chapters 10 to 12 give the last vision.', [['Daniel 9', 'Daniel 9'], ['10 to 12', 'Daniel 10-12']]],
  ['ch. short form', 'In Romans, see ch. 8.', [['8', 'Romans 8']]],
  ['verse after a chapter', 'Ezekiel 10 is the vision; verse 21 gives the faces.', [['Ezekiel 10', 'Ezekiel 10'], ['21', 'Ezekiel 10:21']]],
  ['verses 21 and 22', 'Ezekiel 10 is the vision; verses 21 and 22 are the faces.', [['Ezekiel 10', 'Ezekiel 10'], ['21', 'Ezekiel 10:21'], ['22', 'Ezekiel 10:22']]],
  ['his Ezekiel 10, verse 21, then 22', 'Ezekiel 10 shows the wheels, verse 21 the faces, and 22 is the same.', [['Ezekiel 10', 'Ezekiel 10'], ['21', 'Ezekiel 10:21'], ['22', 'Ezekiel 10:22']]],
  ['vv. 3-5 and v. 7', 'Hebrews 7 is long; compare vv. 3-5 and v. 7.', [['Hebrews 7', 'Hebrews 7'], ['3-5', 'Hebrews 7:3-5'], ['7', 'Hebrews 7:7']]],
  ['verse after an explicit verse', 'Romans 8:28 is the knot, and verse 30 ties it.', [['Romans 8:28', 'Romans 8:28'], ['30', 'Romans 8:30']]],
  ['a bare chapter in a clause about the book', 'Ezekiel sees the glory depart in 11, and returns in 43.', [['11', 'Ezekiel 11'], ['43', 'Ezekiel 43']]],
  ['a bare chapter after see', 'Daniel is the key book, and see 7 for the beasts.', [['7', 'Daniel 7']]],
  ['a chapter list without keyword', 'Romans 8, 9 and 11 are the heart.', [['Romans 8', 'Romans 8'], ['9', 'Romans 9'], ['11', 'Romans 11']]],
  ['a verse list after a verse', 'Hebrews 7:1, 2 and 3 are the story.', [['Hebrews 7:1', 'Hebrews 7:1'], ['2', 'Hebrews 7:2'], ['3', 'Hebrews 7:3']]],
  ['chapter:verse bare', 'Ezekiel is the book, and so is it in 11:3.', [['11:3', 'Ezekiel 11:3']]],
  ['the nearest book wins', 'See Daniel 7 and Revelation 13, then chapter 17.', [['Daniel 7', 'Daniel 7'], ['Revelation 13', 'Revelation 13'], ['17', 'Revelation 17']]],
  ['a book name alone sets the book', 'Paul quotes Isaiah often; chapter 53 above all.', [['53', 'Isaiah 53']]],
  ['a numbered book', 'Take 1 John; chapters 1 and 4 are the pillars.', [['1', '1 John 1'], ['4', '1 John 4']]],
  ['an abbreviated book as written', 'In Ps. 110 and chapter 22 too, verse 3 helps.', [['Ps. 110', 'Ps. 110'], ['22', 'Ps. 22'], ['3', 'Ps. 22:3']]],
  ['a verse past the end', 'Romans 8 is long; verse 99 is not there', [['Romans 8', 'Romans 8']]],
  ['an explicit chapter range', 'Read Daniel 10-12 slowly.', [['Daniel 10-12', 'Daniel 10-12']]],
  ['a book then chapters', 'Daniel is key; see chapters 2 and 7.', [['2', 'Daniel 2'], ['7', 'Daniel 7']]],
];

// Text that is not a reference even with a book named before it.
const NOT_LINKED: [string, string][] = [
  ['no book yet: chapters', 'chapters 2, 7 and 10 to 12 are the heart'],
  ['no book yet: verse', 'verse 22 says it'],
  ['no chapter yet: verse', 'Ezekiel is the book; verse 22 says it'],
  ['a list marker', 'Daniel is first. 1. Revelation next.'],
  ['a list marker after a comma', 'Daniel, then 2. Ezekiel, then 3. Isaiah'],
  ['his top five', 'Here is a top five, ordered by how much light each throws on Daniel.'],
  ['times', 'Daniel prayed 3 times a day'],
  ['times after in', 'Daniel prayed in 3 times of day'],
  ['days after in', 'Daniel lived in Babylon in 2 days of terror'],
  ['a year after in', 'Daniel was written in 165 BC'],
  ['a year of four digits', 'In 1999 Daniel was read'],
  ['a four-digit year after the book', 'Ezekiel in 2024 was read'],
  ['a number after a full stop', 'Ezekiel wrote it. And in 11 more places it is true'],
  ['a number in a new sentence', 'Ezekiel wrote. See 11.'],
  ['a number without a connector', 'Ezekiel appeared 11'],
  ['a chapter past the end', 'Daniel is the book; chapter 13 is not there'],
  ['a time of day', 'Daniel at 10:30 said it'],
  ['the ratio', 'the ratio 7:2'],
  ['a step', 'Step 3 and Chapter 8'],
  ['Revelation. 1 alone', 'on Revelation. 1'],
  ['a number after the dot of a full name', 'Revelation. 1. Daniel'],
  ['a number before the book', '3 Daniel'],
  ['a words-only text', 'Daniel and Ezekiel were prophets'],
  ['a name that is no book', 'Mary, chapters 2 and 3'],
];

describe('references that lean on a book or chapter already named', () => {
  it.each(LINKED)('links %s', (_name, text, expected) => {
    expect(linked(text)).toEqual(expected);
  });

  it.each(NOT_LINKED)('does not link %s', (_name, text) => {
    expect(linked(text)).toEqual([]);
  });

  it('is the same ground in both: the tables hold at least 25 cases', () => {
    expect(LINKED.length + NOT_LINKED.length).toBeGreaterThanOrEqual(25);
  });

  it('keeps the context of one text apart from the next text', () => {
    expect(linked('chapters 2 and 3')).toEqual([]);
    expect(linked('Daniel; chapter 2')).toEqual([['2', 'Daniel 2']]);
  });
});

describe('a range of chapters', () => {
  it('opens its first chapter and its card names the whole range', () => {
    const card = cardOf('Daniel 10-12');
    expect(card?.heading).toBe('Daniel 10-12');
    expect(card?.held?.chapter ?? 10).toBe(10);
    expect(cardOf('Daniel 10-9')?.heading).not.toBe('Daniel 10-9');
  });

  it('carries the range in the address and back', () => {
    const [found] = referencesIn('Daniel, chapters 10 to 12');
    expect(found.as).toBe('Daniel 10-12');
    expect(cardOf(found.as ?? '')?.heading).toBe('Daniel 10-12');
    expect(writtenOf('#/?ref=Daniel%2010-12')).toBe('Daniel 10-12');
  });

  it('does not take a dash that is no range into a plain chapter', () => {
    expect(linked('Romans 8-3 is backwards')).toEqual([['Romans 8', 'Romans 8']]);
  });
});

describe('Markdown links the references that lean on context', () => {
  it('links his answer: the numbers of Daniel and nothing across Revelation. 1', () => {
    const { container } = render(<Markdown text={HIS_ANSWER} />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['2', '7', '10 to 12']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#/?ref=Daniel%202', '#/?ref=Daniel%207', '#/?ref=Daniel%2010-12']);
    expect(container.textContent).toBe(HIS_ANSWER);
  });

  it('keeps the context across bold, a new paragraph and a list', () => {
    render(<Markdown text={'**Ezekiel** is the book; see chapter 10.\n\nIn it, verse 21 gives the faces.\n\n- and chapter 11 next\n- Daniel, chapters 2 and 7'} />);
    expect(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['10', '#/?ref=Ezekiel%2010'],
      ['21', '#/?ref=Ezekiel%2010%3A21'],
      ['11', '#/?ref=Ezekiel%2011'],
      ['2', '#/?ref=Daniel%202'],
      ['7', '#/?ref=Daniel%207'],
    ]);
  });
});
