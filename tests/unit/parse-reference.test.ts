// src/nav/parseReference.ts (mw-5r3p30.622): what the 'Choose a book' search (and every other field that takes a place) makes of what he typed. A reference
// ('John 18:36', 'jn18', 'Ps 23') is a place; a book's name alone is not (it filters the list); a chapter past the book's end says how many it has.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { parseCanonReference } from '../../src/nav/links';
import { findReferences } from '../../src/nav/refsInText';
import { bookPart, readPlace } from '../../src/nav/parseReference';
import { matchingInOrder } from '../../src/ui/listFilter';

const place = (text: string) => {
  const read = readPlace(text);
  expect(read.kind).toBe('place');
  return read.kind === 'place' ? read : (undefined as never);
};

describe('readPlace', () => {
  it('reads John 18:36 as John 18 verse 36', () => {
    expect(place('John 18:36')).toMatchObject({ testament: 'nt', book: 'jhn', chapter: 18, verse: 36 });
  });

  it('reads John 18 as the chapter, with no verse', () => {
    const read = place('John 18');
    expect(read).toMatchObject({ book: 'jhn', chapter: 18 });
    expect(read.verse).toBeUndefined();
  });

  it.each([
    ['Jn 18:36', 'jhn', 18, 36],
    ['jn18', 'jhn', 18, undefined],
    ['1 Jn 2:1', '1jn', 2, 1],
    ['1john 2', '1jn', 2, undefined],
    ['Ps 23', 'psa', 23, undefined],
    ['Song 2:4', 'sng', 2, 4],
    ['  john   3 : 16 ', 'jhn', 3, 16],
  ])('reads %s', (text, book, chapter, verse) => {
    const read = place(text);
    expect(read).toMatchObject({ book, chapter });
    expect(read.verse).toBe(verse);
  });

  it('marks the Old Testament, which Lampas has no text of', () => {
    expect(place('Ps 23').testament).toBe('ot');
  });

  it('opens a range at its first verse and keeps the last', () => {
    expect(place('John 18:36-38')).toMatchObject({ book: 'jhn', chapter: 18, verse: 36, to: 38 });
  });

  it('does not take a book name alone for a reference', () => {
    for (const text of ['John', '1 John', 'Psalms', 'rom', '', '  ']) expect(readPlace(text).kind).toBe('none');
  });

  it('does not take words that name no book for a reference', () => {
    for (const text of ['Hezekiah 3:1', 'hello 5', 'Tobit 3:1']) expect(readPlace(text).kind).toBe('none');
  });

  it('says how many chapters a book has when the chapter is past its end', () => {
    expect(readPlace('John 99')).toEqual({ kind: 'bad', message: 'John has 21 chapters' });
    expect(readPlace('John 99:1')).toEqual({ kind: 'bad', message: 'John has 21 chapters' });
    expect(readPlace('Ps 151')).toEqual({ kind: 'bad', message: 'Psalms has 150 chapters' });
    expect(readPlace('Jude 2')).toEqual({ kind: 'bad', message: 'Jude has 1 chapter' });
  });

  it('says a chapter 0 is not one', () => {
    expect(readPlace('John 0')).toEqual({ kind: 'bad', message: 'John has 21 chapters' });
  });
});

// mw-5r3p30.683: a typed book is any unique start of a book's name (or a listed abbreviation); a start that fits one NT book goes to it, else nothing is guessed.
describe('readPlace takes a start of a book', () => {
  it.each(['ep 4:15', 'Eph 4:15', 'ephe 4 15', 'EP 4:15', ' Ep  4 : 15 '])('reads %s as Ephesians 4:15', (text) => {
    expect(place(text)).toMatchObject({ testament: 'nt', book: 'eph', chapter: 4, verse: 15 });
  });

  it('reads a chapter alone, and a range, with a start of a name', () => {
    expect(place('ep 4')).toMatchObject({ book: 'eph', chapter: 4 });
    expect(place('ep 4:15-17')).toMatchObject({ book: 'eph', chapter: 4, verse: 15, to: 17 });
    expect(place('1 cor 13')).toMatchObject({ book: '1co', chapter: 13 });
    expect(place('revel 3:20')).toMatchObject({ book: 'rev', chapter: 3, verse: 20 });
  });

  it('goes to the one New Testament book a start fits, never an Old Testament one', () => {
    expect(place('Jo 3:16')).toMatchObject({ testament: 'nt', book: 'jhn', chapter: 3, verse: 16 });
    expect(place('1 j 2')).toMatchObject({ book: '1jn', chapter: 2 });
  });

  it('keeps a name the tables list as it was (an exact name beats a start)', () => {
    expect(place('Jon 2')).toMatchObject({ testament: 'ot', book: 'jon', chapter: 2 });
    expect(place('Phil 2')).toMatchObject({ testament: 'nt', book: 'php', chapter: 2 });
    expect(place('Jud 1')).toMatchObject({ testament: 'nt', book: 'jud', chapter: 1 });
  });

  it('goes to an Old Testament book when no New Testament one fits and only one Old Testament one does', () => {
    expect(place('Gene 1:1')).toMatchObject({ testament: 'ot', book: 'gen', chapter: 1, verse: 1 });
    expect(place('Joe 2')).toMatchObject({ testament: 'ot', book: 'jol', chapter: 2 });
  });

  it('guesses nothing when a start fits more than one book', () => {
    for (const text of ['J 3', 'Ph 1', 'ph 1:2', 'Ma 5', '1 t 2', 'Ze 3']) expect(readPlace(text).kind, text).toBe('none');
  });

  it('still says how many chapters the book has', () => {
    expect(readPlace('ep 9')).toEqual({ kind: 'bad', message: 'Ephesians has 6 chapters' });
    expect(readPlace('John 99')).toEqual({ kind: 'bad', message: 'John has 21 chapters' });
  });

  it('does not take a name alone, or words that start no book, for a place', () => {
    for (const text of ['ep', 'eph', 'ephe', 'xyz 3', 'hello 5', 'Hezekiah 3:1']) expect(readPlace(text).kind, text).toBe('none');
  });
});

describe('the looser book match reaches only what he types', () => {
  it('leaves parseCanonReference, which reads free text, to the names in the table', () => {
    for (const text of ['Ep 4:15', 'Ephe 4:15', 'Jo 3:16', 'Gene 1:1']) expect(parseCanonReference(text), text).toBeNull();
  });

  it('turns no ordinary word of a text into a reference', () => {
    const text = 'We met at ep 4 times, jo 3 of them, the Ephe 2 and Revel 5 of Gene 1 in a Matt 4 hour wait.';
    expect(findReferences(text).map((r) => r.printed)).toEqual(['Matt 4']);
  });
});

describe('the list filter', () => {
  const items = BOOKS.map((b) => ({ id: b.code, name: b.name }));
  const names = (query: string) => matchingInOrder(items, query).map((i) => i.name);

  it('finds a book by its letters in order', () => {
    expect(names('phlm')).toContain('Philemon');
    expect(names('phlm')).not.toContain('Philippians');
    expect(names('1jn')).toEqual(['1 John']);
    expect(names('1 jn')).toEqual(['1 John']);
  });

  it('lists the names that start with what he typed first', () => {
    expect(names('rom')[0]).toBe('Romans');
    const j = names('j');
    const starts = items.filter((i) => i.name.startsWith('J')).map((i) => i.name);
    expect(j.slice(0, starts.length)).toEqual(starts);
    expect(names('ph').slice(0, 2)).toEqual(['Philippians', 'Philemon']);
  });

  it('puts a name that holds it before one that has only its letters in order', () => {
    const rom = names('rom');
    expect(rom.indexOf('Romans')).toBeLessThan(rom.indexOf('Deuteronomy'));
  });

  it('keeps every book for an empty search and none for letters no name has', () => {
    expect(names('  ')).toHaveLength(66);
    expect(names('zzq')).toEqual([]);
  });

  it('keeps the name of what he typed when a chapter follows it', () => {
    expect(bookPart('J 3')).toBe('J');
    expect(bookPart('ph 1:2')).toBe('ph');
    expect(bookPart('1 jo 3:16-18')).toBe('1 jo');
    expect(bookPart('jn18')).toBe('jn');
    expect(bookPart('1 John')).toBe('1 John');
    expect(bookPart('1')).toBe('1');
    expect(names(bookPart('J 3')).slice(0, 3)).toEqual(['Joshua', 'Judges', 'Job']);
  });
});

describe('one reference parser', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const path = join(dir, f);
      return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(f) ? [path] : [];
    });

  it('keeps the book-name table in src/nav/links.ts only', () => {
    const holders = files('src').filter((f) => /\bBOOK_BY_NAME\b|\bOT_BY_NAME\b/.test(readFileSync(f, 'utf8')));
    expect(holders).toEqual([join('src', 'nav', 'links.ts')]);
  });

  it('has the chapter picker read what he types through readPlace', () => {
    expect(readFileSync('src/ChapterPicker.tsx', 'utf8')).toContain("from './nav/parseReference'");
  });

  it('has no other source file that reads a book name out of typed text on its own', () => {
    const own = files('src').filter((f) => /new Map\([^)]*\bOSIS\b/.test(readFileSync(f, 'utf8')));
    expect(own).toEqual([]);
  });
});
