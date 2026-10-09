import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BookIndex } from '../../src/data/chapter';
import { BOOKS } from '../../src/data/books';
import { OT_BOOKS } from '../../src/data/otBooks';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { DEFAULT_CHAPTER } from '../../src/data/readerChapter';
import { findWord, linkOf, OSIS, parseCanonReference, parseReference, referenceUrl, resolveReference, wordUrl } from '../../src/nav/links';

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as LemmaLexicon;

describe('parseReference', () => {
  it.each([
    ['Rom.8.28', { book: 'rom', chapter: 8, verse: 28 }],
    ['rom.8.28', { book: 'rom', chapter: 8, verse: 28 }],
    ['ROM.8.28', { book: 'rom', chapter: 8, verse: 28 }],
    ['Rom 8:28', { book: 'rom', chapter: 8, verse: 28 }],
    ['Romans 8:28', { book: 'rom', chapter: 8, verse: 28 }],
    ['Romans%208:28'.replace('%20', ' '), { book: 'rom', chapter: 8, verse: 28 }],
    ['Romans+8:28', { book: 'rom', chapter: 8, verse: 28 }],
    ['1 John 1:9', { book: '1jn', chapter: 1, verse: 9 }],
    ['1John.1.9', { book: '1jn', chapter: 1, verse: 9 }],
    ['1Jn.1.9', { book: '1jn', chapter: 1, verse: 9 }],
    ['1jn 1 9', { book: '1jn', chapter: 1, verse: 9 }],
    ['John 3:16', { book: 'jhn', chapter: 3, verse: 16 }],
    ['Jn.3.16', { book: 'jhn', chapter: 3, verse: 16 }],
    ['Phil 4:13', { book: 'php', chapter: 4, verse: 13 }],
    ['Phlm 1:6', { book: 'phm', chapter: 1, verse: 6 }],
    ['1 Corinthians 13:4', { book: '1co', chapter: 13, verse: 4 }],
    ['1Cor.13.4', { book: '1co', chapter: 13, verse: 4 }],
    ['Rom 8', { book: 'rom', chapter: 8 }],
    ['Rom.8', { book: 'rom', chapter: 8 }],
    ['Romans', { book: 'rom' }],
    ['Rom.8.28-30', { book: 'rom', chapter: 8, verse: 28 }],
    ['  Rom 8:28  ', { book: 'rom', chapter: 8, verse: 28 }],
    ['web+lampas:Rom.8.28', { book: 'rom', chapter: 8, verse: 28 }],
    ['web+lampas://Rom.8.28', { book: 'rom', chapter: 8, verse: 28 }],
  ])('reads %s', (text, expected) => {
    expect(parseReference(text)).toEqual(expected);
  });

  it('names every one of the 27 books by its OSIS code and by its full name', () => {
    for (const { code, name } of BOOKS) {
      expect(parseReference(`${OSIS[code]}.2.3`), OSIS[code]).toEqual({ book: code, chapter: 2, verse: 3 });
      expect(parseReference(`${name} 2:3`), name).toEqual({ book: code, chapter: 2, verse: 3 });
    }
  });

  it('is null for a book it does not know, and for text that is not a reference', () => {
    expect(parseReference('Tobit.3.1')).toBeNull();
    expect(parseReference('Genesis 1:1')).toBeNull();
    expect(parseReference('')).toBeNull();
    expect(parseReference('8:28')).toBeNull();
    expect(parseReference('Rom.8.28.9')).toBeNull();
  });
});

describe('parseCanonReference', () => {
  it.each([
    ['Isaiah 53:5', { testament: 'ot', book: 'isa', chapter: 53, verse: 5 }],
    ['Isa.53.5', { testament: 'ot', book: 'isa', chapter: 53, verse: 5 }],
    ['Genesis 15:6', { testament: 'ot', book: 'gen', chapter: 15, verse: 6 }],
    ['Gen 15:6', { testament: 'ot', book: 'gen', chapter: 15, verse: 6 }],
    ['Psalm 23:1', { testament: 'ot', book: 'psa', chapter: 23, verse: 1 }],
    ['Psalms 23', { testament: 'ot', book: 'psa', chapter: 23 }],
    ['1 Samuel 3:4', { testament: 'ot', book: '1sa', chapter: 3, verse: 4 }],
    ['2Kgs 2:11', { testament: 'ot', book: '2ki', chapter: 2, verse: 11 }],
    ['Song of Solomon 2:1', { testament: 'ot', book: 'sng', chapter: 2, verse: 1 }],
    ['Habakkuk 2:4', { testament: 'ot', book: 'hab', chapter: 2, verse: 4 }],
    ['Isaiah 53', { testament: 'ot', book: 'isa', chapter: 53 }],
    ['Romans 8:31', { testament: 'nt', book: 'rom', chapter: 8, verse: 31 }],
    ['1 John 1:9', { testament: 'nt', book: '1jn', chapter: 1, verse: 9 }],
  ])('reads %s', (text, expected) => {
    expect(parseCanonReference(text)).toEqual(expected);
  });

  it('names every one of the 39 Old Testament books by its code, its name and its Logos abbreviation, and none as a New Testament book', () => {
    for (const { code, name, logos } of OT_BOOKS) {
      for (const written of [code, name, logos]) {
        expect(parseCanonReference(`${written} 2:3`), written).toEqual({ testament: 'ot', book: code, chapter: 2, verse: 3 });
      }
      expect(parseReference(`${name} 2:3`), name).toBeNull();
    }
  });

  it('is null for a book neither Testament has, and for text that is not a reference', () => {
    for (const text of ['Tobit 3:1', 'Sirach 1:1', '', '53:5', 'Isaiah 53:5:1']) expect(parseCanonReference(text), text).toBeNull();
  });
});

describe('resolveReference', () => {
  const resolve = (text: string) => resolveReference(text, index, DEFAULT_CHAPTER);

  it('opens the chapter and selects the verse when the text holds them', () => {
    expect(resolve('Rom.8.28')).toEqual({ book: 'rom', chapter: 8, verse: 28, notice: null });
    expect(resolve('1Jn.1.9')).toEqual({ book: '1jn', chapter: 1, verse: 9, notice: null });
  });

  it('opens a chapter alone with no verse selected', () => {
    expect(resolve('Rom 8')).toEqual({ book: 'rom', chapter: 8, verse: null, notice: null });
  });

  it('opens a book alone at its first chapter', () => {
    expect(resolve('Jude')).toEqual({ book: 'jud', chapter: 1, verse: null, notice: null });
  });

  it('opens the last verse of the chapter for a verse past its end, and says what was asked for', () => {
    const last = index.books.find((b) => b.code === 'rom')!.verses[7];
    const opened = resolve('Rom.8.99');
    expect(opened).toMatchObject({ book: 'rom', chapter: 8, verse: last });
    expect(opened.notice).toBe(`“Rom.8.99” is not in Lampas; showing Romans 8:${last}.`);
  });

  it('opens the last chapter of the book for a chapter past its end, with no verse selected', () => {
    const opened = resolve('Romans 99:1');
    expect(opened).toEqual({ book: 'rom', chapter: 16, verse: null, notice: '“Romans 99:1” is not in Lampas; showing Romans 16.' });
  });

  it('opens the first chapter for chapter 0 and the first verse for verse 0', () => {
    expect(resolve('Rom.0.1')).toMatchObject({ book: 'rom', chapter: 1, verse: null });
    expect(resolve('Rom.0.1').notice).not.toBeNull();
    expect(resolve('Rom.8.0')).toMatchObject({ book: 'rom', chapter: 8, verse: 1 });
  });

  it('opens the chapter he had open for a book Lampas does not hold, and says what was asked for', () => {
    const opened = resolve('Tobit 3:1');
    expect(opened).toEqual({ book: 'rom', chapter: 8, verse: null, notice: '“Tobit 3:1” is not in Lampas; showing Romans 8.' });
  });

  it('treats a book missing from the index as not held', () => {
    const without: BookIndex = { books: index.books.filter((b) => b.code !== 'jud') };
    const opened = resolveReference('Jude 1:3', without, DEFAULT_CHAPTER);
    expect(opened).toMatchObject({ book: 'rom', chapter: 8, verse: null });
    expect(opened.notice).toBe('“Jude 1:3” is not in Lampas; showing Romans 8.');
  });
});

describe('findWord', () => {
  it('finds a word by its Strong’s number, in any usual spelling', () => {
    for (const text of ['G3551', 'g3551', '3551', 'G03551', ' G3551 ']) {
      expect(findWord(text, lexicon), text).toMatchObject({ lemma: 'νόμος', entry: { s: 'G3551', g: 'law' } });
    }
  });

  it('finds a word by its lemma, with or without accents and breathings', () => {
    expect(findWord('νόμος', lexicon)?.lemma).toBe('νόμος');
    expect(findWord('νομος', lexicon)?.lemma).toBe('νόμος');
    // a decomposed spelling is the same word
    expect(findWord('νόμος'.normalize('NFD'), lexicon)?.lemma).toBe('νόμος');
  });

  it('is undefined for a number or a word the text never uses', () => {
    expect(findWord('G99999', lexicon)).toBeUndefined();
    expect(findWord('ζζζζ', lexicon)).toBeUndefined();
    expect(findWord('', lexicon)).toBeUndefined();
  });
});

describe('linkOf', () => {
  it('reads ref and word from the address', () => {
    expect(linkOf('#/?ref=Rom.8.28')).toEqual({ kind: 'reference', text: 'Rom.8.28' });
    expect(linkOf('#/?ref=Romans%208:28')).toEqual({ kind: 'reference', text: 'Romans 8:28' });
    expect(linkOf('#/?word=G3551')).toEqual({ kind: 'word', text: 'G3551' });
    expect(linkOf('#/?word=%CE%BD%CF%8C%CE%BC%CE%BF%CF%82')).toEqual({ kind: 'word', text: 'νόμος' });
  });

  it('reads the web+lampas: form the browser hands over, as a reference or as a word', () => {
    expect(linkOf('#/?ref=web%2Blampas%3ARom.8.28')).toEqual({ kind: 'reference', text: 'Rom.8.28' });
    expect(linkOf('#/?ref=web%2Blampas%3Aword%3AG3551')).toEqual({ kind: 'word', text: 'G3551' });
    expect(linkOf('#/?ref=web%2Blampas%3Aword%2FG3551')).toEqual({ kind: 'word', text: 'G3551' });
  });

  it('is null for an address that is not a link', () => {
    expect(linkOf('#/')).toBeNull();
    expect(linkOf('#/?b=rom&c=8&v=28')).toBeNull();
    expect(linkOf('#/?ref=')).toBeNull();
    // another screen is not a link, whatever it carries
    expect(linkOf('#/words?ref=Rom.8.28')).toBeNull();
  });
});

describe('the links he copies', () => {
  it('writes the https form of a verse, a chapter and a word', () => {
    expect(referenceUrl('rom', 8, 28)).toBe('https://lampas.allmymind.org/#/?ref=Rom.8.28');
    expect(referenceUrl('1jn', 1, 9)).toBe('https://lampas.allmymind.org/#/?ref=1John.1.9');
    expect(referenceUrl('rom', 8)).toBe('https://lampas.allmymind.org/#/?ref=Rom.8');
    expect(wordUrl('G3551')).toBe('https://lampas.allmymind.org/#/?word=G3551');
  });

  it('writes links that read back as the same place', () => {
    for (const { code } of BOOKS) {
      const link = referenceUrl(code, 2, 3);
      expect(linkOf(link.slice(link.indexOf('#')))).toEqual({ kind: 'reference', text: expect.any(String) });
      expect(parseReference(new URL(link).hash.replace('#/?ref=', ''))).toEqual({ book: code, chapter: 2, verse: 3 });
    }
  });
});
