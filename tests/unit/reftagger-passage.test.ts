import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { headingOf, isOnlyTheStart, passageOf, versesOf, versesUrl } from '../../src/reftagger/passage';
import { plainVerses, translationName } from '../../src/reftagger/verses';
import { TRANSLATION_NAME } from '../../src/reader/englishSource';
import { sourceLanguage, type Chapter } from '../../src/data/chapter';
import { translationOf } from '../../src/reader/englishSource';

const chapterFile = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const smallFile = (code: string, n: number) => JSON.parse(readFileSync(`public/data/verses-${code}-${n}.json`, 'utf8')) as unknown;

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

  it('heads a chapter range with its range, and says a chapter alone or a range is only the start (mw-5r3p30.1087)', () => {
    expect(passageOf(`${REF}Matt.5`, 7)).toEqual({ code: 'mat', chapter: 5, lastChapter: 7 });
    expect(passageOf(`${REF}Matt.5`, 5)).toEqual({ code: 'mat', chapter: 5 });
    expect(passageOf(`${REF}Matt.5`, 3)).toEqual({ code: 'mat', chapter: 5 });
    expect(passageOf(`${REF}Matt.5.3`, 7)).toEqual({ code: 'mat', chapter: 5, first: 3, last: 3 });
    expect(headingOf({ code: 'mat', chapter: 5, lastChapter: 7 })).toBe('Matthew 5-7');
    expect(isOnlyTheStart({ code: 'mat', chapter: 5, lastChapter: 7 })).toBe(true);
    expect(isOnlyTheStart({ code: 'jhn', chapter: 11 })).toBe(true);
    expect(isOnlyTheStart({ code: 'jhn', chapter: 5, first: 24, last: 29 })).toBe(false);
    expect(isOnlyTheStart({ code: 'jhn', chapter: 5, first: 25, last: 25 })).toBe(false);
  });

  it('fetches one small file of the chapter\'s English, under /data/, from the app\'s origin (mw-5r3p30.1086)', () => {
    expect(versesUrl({ code: 'jhn', chapter: 5 })).toBe('https://lampas.allmymind.org/data/verses-jhn-5.json');
    expect(versesUrl({ code: 'jhn', chapter: 5 }, 'http://127.0.0.1:4000')).toBe('http://127.0.0.1:4000/data/verses-jhn-5.json');
  });

  it('keeps the file for a chapter far smaller than the chapter file: John 5 is a few KB of text, not 177 KB', () => {
    const whole = statSync('public/data/jhn/5.json').size;
    const small = statSync('public/data/verses-jhn-5.json').size;
    expect(whole).toBeGreaterThan(150_000);
    expect(small).toBeLessThan(10_000);
    expect(small).toBeLessThan(whole / 15);
  });

  it('names the translation the text is really from: the Berean Standard Bible for the Old Testament, the Majority Standard Bible for the New (ATTRIBUTION.md)', () => {
    const attribution = readFileSync('ATTRIBUTION.md', 'utf8');
    expect(attribution).toMatch(/Majority Standard Bible \(MSB\)[^\n]*New Testament tables/);
    expect(attribution).toMatch(/Berean Standard Bible tables[^\n]*\n- ?[^\n]*|Berean Standard Bible tables[^\n]*Old Testament/);
    expect(translationName(smallFile('jhn', 5))).toBe('Majority Standard Bible');
    expect(translationName(smallFile('gen', 1))).toBe('Berean Standard Bible');
    expect(translationName(smallFile('2ki', 2))).toBe('Berean Standard Bible');
    expect(translationName(smallFile('mat', 5))).toBe('Majority Standard Bible');
    expect(translationName(null)).toBeNull();
    expect(translationName({ t: 'nope', v: {} })).toBeNull();
    // the app's own names (the Reader's and the reference card's) are these
    expect(translationName({ t: 'msb', v: {} })).toBe(TRANSLATION_NAME.msb);
    expect(translationName({ t: 'bsb', v: {} })).toBe(TRANSLATION_NAME.bsb);
  });

  it('the small file of each chapter is the chapter\'s own English, tagged by its testament', () => {
    for (const [code, n] of [['jhn', 5], ['gen', 1], ['psa', 23], ['rom', 8]] as const) {
      const chapter = chapterFile(`${code}/${n}`);
      expect(smallFile(code, n)).toEqual(plainVerses(chapter, translationOf(sourceLanguage(chapter))));
      expect((smallFile(code, n) as { t: string }).t).toBe(translationOf(sourceLanguage(chapter)));
    }
    expect((smallFile('gen', 1) as { t: string }).t).toBe('bsb');
    expect((smallFile('jhn', 5) as { t: string }).t).toBe('msb');
  });

  it('reads the verses out of the small file: English runs in order, one verse, a range, a chapter alone is its first', () => {
    const file = smallFile('jhn', 5);
    expect(versesOf(file, passageOf(`${REF}John.5.25`)!)).toEqual([
      { n: 25, text: 'Truly, truly, I tell you, the hour is coming and has now come when the dead will hear the voice of the Son of God, and those who hear will live.' },
    ]);
    expect(versesOf(file, passageOf(`${REF}John.5.24-29`)!).map((v) => v.n)).toEqual([24, 25, 26, 27, 28, 29]);
    expect(versesOf(file, passageOf(`${REF}John.5`)!).map((v) => v.n)).toEqual([1]);
    expect(versesOf(file, { code: 'jhn', chapter: 5, first: 900, last: 901 })).toEqual([]);
    expect(versesOf(file, { code: 'jhn', chapter: 5, first: 25, last: 999_999_999 }).map((v) => v.n)).toEqual([25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]);
  });

  it('gives no verses for a file that is not a chapter\'s English', () => {
    const one = { code: 'jhn', chapter: 5, first: 1, last: 1 };
    expect(versesOf(null, one)).toEqual([]);
    expect(versesOf({ v: 'x' }, one)).toEqual([]);
    expect(versesOf({ t: 'msb', v: { 1: 3 } }, one)).toEqual([]);
    expect(versesOf({ t: 'msb', v: { 1: '  two   words ' } }, one)).toEqual([{ n: 1, text: 'two words' }]);
  });
});
