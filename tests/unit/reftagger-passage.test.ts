import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapterUrl, headingOf, passageOf, versesOf } from '../../src/reftagger/passage';

const REF = 'https://lampas.allmymind.org/#/?ref=';

describe('the blog popup: what a tagged link names (mw-5r3p30.1048)', () => {
  it('reads a verse, a range and a chapter back from the link, in either testament', () => {
    expect(passageOf(`${REF}John.5.25`)).toEqual({ code: 'jhn', chapter: 5, first: 25, last: 25 });
    expect(passageOf(`${REF}John.5.24-29`)).toEqual({ code: 'jhn', chapter: 5, first: 24, last: 29 });
    expect(passageOf(`${REF}1Kgs.17.17-24`)).toEqual({ code: '1ki', chapter: 17, first: 17, last: 24 });
    expect(passageOf(`${REF}John.11`)).toEqual({ code: 'jhn', chapter: 11 });
    expect(passageOf(`${REF}1John.5.25`)?.code).toBe('1jn');
  });

  it('names no passage for an address that is no reference', () => {
    expect(passageOf('https://example.com/x')).toBeNull();
    expect(passageOf(`${REF}Nope.1.1`)).toBeNull();
    expect(passageOf(`${REF}John`)).toBeNull();
  });

  it('heads it as people write it', () => {
    expect(headingOf({ code: 'jhn', chapter: 5, first: 25, last: 25 })).toBe('John 5:25');
    expect(headingOf({ code: 'jhn', chapter: 5, first: 24, last: 29 })).toBe('John 5:24-29');
    expect(headingOf({ code: '1ki', chapter: 17, first: 17, last: 24 })).toBe('1 Kings 17:17-24');
    expect(headingOf({ code: 'psa', chapter: 23, first: 1, last: 1 })).toBe('Psalm 23:1');
    expect(headingOf({ code: 'jhn', chapter: 11 })).toBe('John 11');
  });

  it('fetches the chapter file of the app, from the app\'s origin', () => {
    expect(chapterUrl({ code: 'jhn', chapter: 5 })).toBe('https://lampas.allmymind.org/data/jhn/5.json');
    expect(chapterUrl({ code: 'jhn', chapter: 5 }, 'http://127.0.0.1:4000')).toBe('http://127.0.0.1:4000/data/jhn/5.json');
  });

  it('reads the verses out of a chapter file: English runs in order, one verse, a range, a chapter alone is its first', () => {
    const file = JSON.parse(readFileSync('public/data/jhn/5.json', 'utf8'));
    expect(versesOf(file, passageOf(`${REF}John.5.25`)!)).toEqual([
      { n: 25, text: 'Truly, truly, I tell you, the hour is coming and has now come when the dead will hear the voice of the Son of God, and those who hear will live.' },
    ]);
    expect(versesOf(file, passageOf(`${REF}John.5.24-29`)!).map((v) => v.n)).toEqual([24, 25, 26, 27, 28, 29]);
    expect(versesOf(file, passageOf(`${REF}John.5`)!).map((v) => v.n)).toEqual([1]);
    expect(versesOf(file, { code: 'jhn', chapter: 5, first: 900, last: 901 })).toEqual([]);
  });

  it('gives no verses for a file that is not a chapter', () => {
    expect(versesOf(null, { code: 'jhn', chapter: 5, first: 1, last: 1 })).toEqual([]);
    expect(versesOf({ verses: 'x' }, { code: 'jhn', chapter: 5, first: 1, last: 1 })).toEqual([]);
    expect(versesOf({ verses: [{ n: 1, e: [{ t: 3 }] }] }, { code: 'jhn', chapter: 5, first: 1, last: 1 })).toEqual([]);
  });
});
