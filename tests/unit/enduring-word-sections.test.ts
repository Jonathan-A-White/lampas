// Enduring Word (mw-1l901so.2): a chapter's page opens at the outline section whose verse range holds the verse he started from. The page's headings carry ids section-1, section-2 ... in order and name their
// range in their text ('2. (4) ...', '3. (5-8) ...'); the fixture is John 3's headings as the page has them (note the numbering starts again at 1 where the chapter's second part begins: the id does not).
import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chaptersToRead } from '../../scripts/enduring-word-sections';
import table from '../../src/resources/enduringWordSections.json';
import fixture from '../fixtures/enduring-word-john-3-headings.json';
import { ENDURING_WORD_SECTIONS, enduringWordSectionOf, enduringWordUrl, headingRange, rangesOfHeadings, sectionStart } from '../../src/resources/enduringWord';

const PAGE = 'https://enduringword.com/bible-commentary/john-3/';
const ranges = rangesOfHeadings(fixture.headings);

describe('a heading’s verse range', () => {
  it.each([
    ['2. (4) Nicodemus answers: How can this be?', '4'],
    ['3. (5-8) Jesus explains the new birth.', '5-8'],
    ['1. (22-24) Jesus baptizes in Judea', '22-24'],
    ['12. (101–103) an en dash is a dash', '101-103'],
    ['1. (4-5a) A verse split between two sections', '4-5'],
    ['2. (5b-6) The rest of it', '5-6'],
    ['1. (11a) A part of one verse', '11'],
  ])('%s is %s', (heading, range) => {
    expect(headingRange(heading)).toBe(range);
  });

  it.each([
    ['1. (15:1-12) a combined page names the chapter', 15, '1-12'],
    ['1. (15:1-12) a combined page names the chapter', 16, undefined],
    ['2. (5:1a) a part of one verse', 5, '1'],
    ['1. (23:27-24:2) begun in the chapter before', 24, '1-2'],
    ['1. (23:27-24:2) begun in the chapter before', 23, '27-'],
    ['5. (35-9:1) ending in the next chapter', 8, '35-'],
    ['5. (35-9:1) ending in the next chapter', 9, '1'],
    ['1. (11:9-11:10) both of the chapter before', 12, undefined],
    ['4. (10:1-4) all in the next chapter', 9, undefined],
    ['6. (4e-6) a later part of a verse', 1, '4-6'],
  ])('%s: in chapter %i it is %s', (heading, chapter, range) => {
    expect(headingRange(heading, chapter)).toBe(range);
  });

  it('names no verses of an unnamed chapter where it names its own', () => {
    expect(headingRange('1. (15:1-12) The borders')).toBeUndefined();
  });

  it('holds to the end of the chapter where the range runs on', () => {
    expect(enduringWordSectionOf(['1-34', '35-'], 38)).toBe(2);
    expect(enduringWordSectionOf(['35-'], 34)).toBeUndefined();
  });

  it('still counts a heading that names its chapter when the reader looks for section N', () => {
    expect(sectionStart(['1. (15:1-12) A', 'Words.', '2. (15:13-19) B'], 2)).toBe(2);
  });

  it.each(['Introduction', 'Conclusion (see above)', '1. Nicodemus without a range', ''])('“%s” names none', (heading) => {
    expect(headingRange(heading)).toBeUndefined();
  });
});

describe('the section that holds a verse of John 3', () => {
  it('reads one range per heading, in order', () => {
    expect(ranges).toEqual(['1-3', '4', '5-8', '9-13', '14-15', '16', '17-21', '22-24', '25-26', '27-30', '31-33', '34-36']);
  });

  it.each([
    [16, 6],
    [5, 3],
    [35, 12],
    [1, 1],
    [4, 2],
    [8, 3],
    [22, 8],
    [36, 12],
  ])('John 3:%i is section-%i', (verse, section) => {
    expect(enduringWordSectionOf(ranges, verse)).toBe(section);
  });

  it.each([0, 37, 40])('John 3:%i is in no range', (verse) => {
    expect(enduringWordSectionOf(ranges, verse)).toBeUndefined();
  });

  it('skips a heading with no range but counts it for the id', () => {
    expect(enduringWordSectionOf(['1-2', undefined, '5'], 5)).toBe(3);
  });
});

describe('the table of every chapter (npm run ew:sections writes it)', () => {
  const entries = Object.entries(table as Record<string, string>);

  it('holds only verse numbers, under the slugs of chapters we know', () => {
    const chapters = new Set(chaptersToRead());
    expect(entries.filter(([page]) => !chapters.has(page))).toEqual([]);
    expect(entries.filter(([, ranges]) => !/^(\d+(-\d*)?)?(,(\d+(-\d*)?)?)*$/.test(ranges))).toEqual([]);
  });

  it('is under 200 KB', () => {
    expect(statSync('src/resources/enduringWordSections.json').size).toBeLessThan(200 * 1024);
  });

  it('holds nearly every chapter, and Isaiah 1 as the page has it', () => {
    expect(entries.length).toBeGreaterThan(1100);
    expect(ENDURING_WORD_SECTIONS['isaiah-1']).toEqual(['1', '2-4', '5-9', '10-15', '16-20', '21-23', '24-31']);
  });
});

describe('the address a verse opens', () => {
  it('is the section’s anchor where the chapter’s outline is known', () => {
    expect(enduringWordUrl('jhn', 3, 16)).toBe(`${PAGE}#section-6`);
    expect(enduringWordUrl('jhn', 3, 5)).toBe(`${PAGE}#section-3`);
    expect(enduringWordUrl('jhn', 3, 35)).toBe(`${PAGE}#section-12`);
  });

  it('is the chapter’s top where no range holds the verse, or no verse is named', () => {
    expect(enduringWordUrl('jhn', 3, 40)).toBe(PAGE);
    expect(enduringWordUrl('jhn', 3)).toBe(PAGE);
  });

  it('is the chapter’s top where the chapter’s outline is not known', () => {
    // every chapter the site has is in the table since mw-1l901so.7, so one it has not (John has 21) stands for it
    expect(ENDURING_WORD_SECTIONS['john-22']).toBeUndefined();
    expect(enduringWordUrl('jhn', 22, 5)).toBe('https://enduringword.com/bible-commentary/john-22/');
  });

  it('keeps what it knows of John 3 as the page has it', () => {
    expect(ENDURING_WORD_SECTIONS['john-3']).toEqual(ranges);
  });
});
