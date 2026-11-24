// Enduring Word (mw-1l901so.2): a chapter's page opens at the outline section whose verse range holds the verse he started from. The page's headings carry ids section-1, section-2 ... in order and name their
// range in their text ('2. (4) ...', '3. (5-8) ...'); the fixture is John 3's headings as the page has them (note the numbering starts again at 1 where the chapter's second part begins: the id does not).
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/enduring-word-john-3-headings.json';
import { ENDURING_WORD_SECTIONS, enduringWordSectionOf, enduringWordUrl, headingRange, rangesOfHeadings } from '../../src/resources/enduringWord';

const PAGE = 'https://enduringword.com/bible-commentary/john-3/';
const ranges = rangesOfHeadings(fixture.headings);

describe('a heading’s verse range', () => {
  it.each([
    ['2. (4) Nicodemus answers: How can this be?', '4'],
    ['3. (5-8) Jesus explains the new birth.', '5-8'],
    ['1. (22-24) Jesus baptizes in Judea', '22-24'],
    ['12. (101–103) an en dash is a dash', '101-103'],
  ])('%s is %s', (heading, range) => {
    expect(headingRange(heading)).toBe(range);
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
    expect(enduringWordUrl('jhn', 4, 5)).toBe('https://enduringword.com/bible-commentary/john-4/');
  });

  it('keeps what it knows of John 3 as the page has it', () => {
    expect(ENDURING_WORD_SECTIONS['john-3']).toEqual(ranges);
  });
});
