import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { englishNumber, englishNumbers, numberPhraseOf, numeralPhraseAt, numeralPhrases, numeralValue } from '../../src/data/numerals';

const chapterOf = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;
const verseOf = (code: string, n: number, v: number) => chapterOf(code, n).verses.find((x) => x.n === v)!;

describe('numeralValue', () => {
  it('reads a Hebrew numeral by its Strong\'s number and a Greek one by its lemma', () => {
    const gen = verseOf('gen', 14, 14).g;
    expect(numeralValue(gen[10], 'hbo')?.value).toBe(8);
    expect(numeralValue(gen[11], 'hbo')?.value).toBe(10);
    expect(numeralValue(gen[12], 'hbo')?.value).toBe(3);
    expect(numeralValue(gen[13], 'hbo')?.value).toBe(100);
    expect(numeralValue(gen[0], 'hbo')).toBeUndefined();
    const jhn = verseOf('jhn', 21, 11).g;
    expect(numeralValue(jhn[13], 'grc')?.value).toBe(100);
    expect(numeralValue(jhn[14], 'grc')?.value).toBe(50);
    expect(numeralValue(jhn[15], 'grc')?.value).toBe(3);
    expect(numeralValue(jhn[0], 'grc')).toBeUndefined();
  });

  it('does not take an ordinal for a number', () => {
    const gen = verseOf('gen', 2, 2).g;
    expect(numeralValue(gen[3], 'hbo')).toBeUndefined();
  });
});

describe('numeralPhraseAt', () => {
  it('Genesis 14:14, eight ten and three hundred, sums 8 + 10 + 300 = 318 in source order', () => {
    const g = verseOf('gen', 14, 14).g;
    const phrase = numeralPhraseAt(g, 10, 'hbo')!;
    expect(phrase.parts.map((p) => p.index)).toEqual([10, 11, 12, 13]);
    expect(phrase.parts.map((p) => p.value)).toEqual([8, 10, 3, 100]);
    expect(phrase.sum).toBe(318);
    expect(phrase.line).toBe('8 + 10 + 300 = 318');
    // any word of the phrase finds the whole of it
    expect(numeralPhraseAt(g, 13, 'hbo')?.sum).toBe(318);
  });

  it('John 21:11, a hundred fifty three, sums 100 + 50 + 3 = 153', () => {
    const g = verseOf('jhn', 21, 11).g;
    const phrase = numeralPhraseAt(g, 14, 'grc')!;
    expect(phrase.parts.map((p) => p.index)).toEqual([13, 14, 15]);
    expect(phrase.line).toBe('100 + 50 + 3 = 153');
  });

  it('Numbers 1:21, six and forty thousand and five hundred, is 46,500', () => {
    const g = verseOf('num', 1, 21).g;
    const phrase = numeralPhraseAt(g, 3, 'hbo')!;
    expect(phrase.parts).toHaveLength(5);
    expect(phrase.sum).toBe(46500);
    expect(phrase.line).toBe('(6 + 40) × 1,000 + 500 = 46,500');
  });

  it('Revelation 7:4, a hundred and forty four thousands, is 144,000, the kai between its words kept without a value', () => {
    const g = verseOf('rev', 7, 4).g;
    const phrase = numeralPhraseAt(g, 8, 'grc')!;
    expect(phrase.parts.map((p) => p.index)).toEqual([6, 7, 8, 9, 10]);
    expect(phrase.parts[1].value).toBeUndefined();
    expect(phrase.sum).toBe(144000);
  });

  it('Genesis 5:3, thirty and a hundred, is 30 + 100 = 130', () => {
    const g = verseOf('gen', 5, 3).g;
    expect(numeralPhraseAt(g, 2, 'hbo')?.line).toBe('30 + 100 = 130');
  });

  it('a single numeral is no phrase: a hundred (Genesis 17:17), seven alone, the seventh (Genesis 2:2)', () => {
    expect(numeralPhraseAt(verseOf('gen', 17, 17).g, 8, 'hbo')).toBeUndefined();
    expect(numeralPhraseAt(verseOf('gen', 2, 2).g, 3, 'hbo')).toBeUndefined();
    expect(numeralPhraseAt(verseOf('gen', 17, 17).g, 14, 'hbo')).toBeUndefined();
  });

  it('a word that is no numeral finds no phrase', () => {
    expect(numeralPhraseAt(verseOf('gen', 14, 14).g, 0, 'hbo')).toBeUndefined();
  });
});

describe('what is not one number', () => {
  const hebrew = (code: string, n: number, v: number) => numeralPhrases(verseOf(code, n, v).g, 'hbo').map((p) => p.line);
  it('a unit and a tens word with no and between them are two numbers (Exodus 26:2, each, eight and twenty is 28, not 29)', () => {
    expect(hebrew('exo', 26, 2)).toEqual(['8 + 20 = 28']);
  });
  it('a unit and the absolute ten are no teen (1 Kings 6:26, each was ten)', () => {
    expect(hebrew('1ki', 6, 26)).toEqual([]);
  });
  it('the numbers of a text with an and between the tens and the unit add (1 Kings 16:29, thirty and eight)', () => {
    expect(hebrew('1ki', 16, 29)).toEqual(['30 + 8 = 38', '20 + 2 = 22']);
  });
  it('a plural thousand multiplies only the unit before it (Ezekiel 48:16, five hundred and four thousands)', () => {
    expect(hebrew('ezk', 48, 16).slice(0, 3)).toEqual(['500 + 4,000 = 4,500', '500 + 4,000 = 4,500', '500 + 4,000 = 4,500']);
  });
  it('an and-a-thousand is one thousand added (Numbers 3:50)', () => {
    expect(hebrew('num', 3, 50)).toEqual(['5 + 60 + 300 + 1,000 = 1,365']);
  });
  it('Greek thousands with the number after them (Acts 19:19, myriads five) are five myriads', () => {
    expect(numeralPhrases(verseOf('act', 19, 19).g, 'grc').map((p) => p.line)).toEqual(['5 × 10,000 = 50,000']);
  });
});

describe('numberPhraseOf', () => {
  it('a sum the English does not say opens no number: Genesis 5:5, 930 years, is thirty and nine hundred split by a noun', () => {
    const chapter = chapterOf('gen', 5);
    const v = chapter.verses.find((x) => x.n === 5)!;
    const chunk = v.e.find((c) => c.t.startsWith('930'))!;
    expect(numberPhraseOf(chapter, chunk.g.map((i) => v.g[i]), chunk.t, 5)).toBeUndefined();
  });

  it('the chunk "the 318" (Hebrew word 10 alone) finds the whole phrase', () => {
    const chapter = chapterOf('gen', 14);
    const v = chapter.verses.find((x) => x.n === 14)!;
    expect(numberPhraseOf(chapter, [v.g[10]], 'the 318', 14)?.sum).toBe(318);
  });

  it('the chunk "153 ," finds John 21:11\'s phrase', () => {
    const chapter = chapterOf('jhn', 21);
    const v = chapter.verses.find((x) => x.n === 11)!;
    expect(numberPhraseOf(chapter, [v.g[13], v.g[14], v.g[15]], '153 ,', 11)?.sum).toBe(153);
  });

  it('the chunk "trained men" holds numeral words but no number of its own: no phrase', () => {
    const chapter = chapterOf('gen', 14);
    const v = chapter.verses.find((x) => x.n === 14)!;
    expect(numberPhraseOf(chapter, [v.g[7], v.g[11], v.g[12], v.g[13]], 'trained men', 14)).toBeUndefined();
  });

  it('a single-word number ("seven"-ish chunk of one numeral word) opens no phrase', () => {
    const chapter = chapterOf('gen', 17);
    const v = chapter.verses.find((x) => x.n === 17)!;
    expect(numberPhraseOf(chapter, [v.g[8]], 'a hundred', 17)).toBeUndefined();
  });

  it('a chunk with no verse words in the chapter finds nothing', () => {
    expect(numberPhraseOf(chapterOf('gen', 14), [], 'the 318', 14)).toBeUndefined();
  });
});

describe('englishNumber', () => {
  it.each([
    ['the 318', 318],
    ['153 ,', 153],
    ['numbered 46,500.', 46500],
    ['twelve', 12],
    ['forty-six thousand', 46000],
    ['a hundred', 100],
    ['one hundred and twenty', 120],
    ['three hundred', 300],
    ['the twenty-first', 21],
    ['1 ,700 shekels', 1700],
    ['five hundred and four', 504],
  ])('%s is %d', (text, n) => expect(englishNumber(text)).toBe(n));

  it('says nothing of words that are no number', () => {
    expect(englishNumber('trained men')).toBeUndefined();
  });

  it('says each number of a text: one of the twelve is two', () => {
    expect(englishNumbers('of one of the twelve')).toEqual([1, 12]);
    expect(englishNumbers('five and then ten')).toEqual([5, 10]);
  });
});
