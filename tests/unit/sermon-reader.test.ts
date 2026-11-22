// Lampas reads a text sermon aloud in its own reader (mw-ecpivg5.2, docs/sermons.md 'The reader'): the pure parts, the paragraph stepper, his place kept per sermon and the time left. The sheet itself is
// tests/unit/sermon-reader-sheet.test.tsx; the picture at 390x844 is tests/e2e/sermon-reader.spec.ts.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LinkRow } from '../../src/sermons/merge';
import { forgetPlace, keepPlace, minutesLeft, parseText, readPlace, readsHere, stepParagraph, TEXT_SOURCES, timeLeftLine, WORDS_PER_MINUTE } from '../../src/sermons/sermonText';

const row = (over: Partial<LinkRow> = {}): LinkRow => ({ id: '311', source: 'spurgeon-ccel', title: 'The Beginning, Increase, and End of the Divine Life', open: { url: 'https://ccel.org/ccel/spurgeon/sermons06.xxiv.html' }, opensIn: 'web', ...over });

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('which rows Lampas reads aloud', () => {
  it('serves the sources the sermon index serves text for', () => {
    expect(TEXT_SOURCES).toContain('spurgeon-ccel');
    expect(readsHere(row())).toBe(true);
  });

  it('leaves every other source to the web, a Logos row to Logos and a video to the player', () => {
    expect(readsHere(row({ source: 'henry-sermons' }))).toBe(false);
    expect(readsHere(row({ opensIn: 'logos', open: { url: 'https://ref.ly/logosres/x' } }))).toBe(false);
    expect(readsHere(row({ open: { url: 'https://www.youtube.com/watch?v=abcdefghijk' } }))).toBe(false);
  });
});

describe('the paragraph stepper', () => {
  it('goes back and forward one paragraph', () => {
    expect(stepParagraph(3, 10, 1)).toBe(4);
    expect(stepParagraph(3, 10, -1)).toBe(2);
  });

  it('stays at the first paragraph going back and at the last going forward', () => {
    expect(stepParagraph(0, 10, -1)).toBe(0);
    expect(stepParagraph(9, 10, 1)).toBe(9);
  });

  it('has nowhere to go in a sermon of no paragraphs', () => {
    expect(stepParagraph(0, 0, 1)).toBe(0);
  });
});

describe('his place, kept on the device per sermon', () => {
  it('is the top for a sermon he has not read', () => {
    expect(readPlace('spurgeon-ccel', '311', 20)).toBe(0);
  });

  it('is kept for each sermon on its own and read back', () => {
    keepPlace('spurgeon-ccel', '311', 7);
    keepPlace('spurgeon-ccel', '312', 2);
    expect(readPlace('spurgeon-ccel', '311', 20)).toBe(7);
    expect(readPlace('spurgeon-ccel', '312', 20)).toBe(2);
  });

  it('is kept within the sermon: a place past its end (a shorter text now) is its last paragraph', () => {
    keepPlace('spurgeon-ccel', '311', 50);
    expect(readPlace('spurgeon-ccel', '311', 20)).toBe(19);
  });

  it('is the top again once forgotten (Restart, or the sermon read to its end)', () => {
    keepPlace('spurgeon-ccel', '311', 7);
    forgetPlace('spurgeon-ccel', '311');
    expect(readPlace('spurgeon-ccel', '311', 20)).toBe(0);
  });

  it('ignores a saved value that is not a place', () => {
    for (const junk of ['', 'abc', '-3', '2.5', 'NaN']) {
      localStorage.setItem('lampas.sermonPlace.spurgeon-ccel:311', junk);
      expect(readPlace('spurgeon-ccel', '311', 20)).toBe(0);
    }
  });
});

describe('the time left', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');
  const paragraphs = [words(WORDS_PER_MINUTE), words(WORDS_PER_MINUTE), words(WORDS_PER_MINUTE * 2)];

  it('counts the words from the paragraph being read to the end, at his speed', () => {
    expect(minutesLeft(paragraphs, 0, 1)).toBeCloseTo(4, 5);
    expect(minutesLeft(paragraphs, 2, 1)).toBeCloseTo(2, 5);
    expect(minutesLeft(paragraphs, 0, 2)).toBeCloseTo(2, 5);
    expect(minutesLeft(paragraphs, 0, 0.5)).toBeCloseTo(8, 5);
  });

  it('is nothing once past the last paragraph', () => {
    expect(minutesLeft(paragraphs, 3, 1)).toBe(0);
  });

  it('is said as about N min left, rounded up, and under a minute as such', () => {
    expect(timeLeftLine(12.2)).toBe('about 13 min left');
    expect(timeLeftLine(1)).toBe('about 1 min left');
    expect(timeLeftLine(0.4)).toBe('less than a minute left');
    expect(timeLeftLine(0)).toBe('finished');
  });
});

describe('the answer of GET /v1/text', () => {
  it('is its title and its paragraphs, with the empty ones left out', () => {
    expect(parseText({ id: '311', title: 'T', source: 'spurgeon-ccel', url: 'u', paragraphs: ['One.', '  ', 'Two.'] })).toEqual({ title: 'T', paragraphs: ['One.', 'Two.'] });
  });

  it('is nothing when there is no paragraph or the answer is not that shape', () => {
    expect(parseText({ title: 'T', paragraphs: [] })).toBeUndefined();
    expect(parseText({ title: 'T' })).toBeUndefined();
    expect(parseText({ title: 'T', paragraphs: [1, 2] })).toBeUndefined();
    expect(parseText(null)).toBeUndefined();
    expect(parseText('text')).toBeUndefined();
  });
});
