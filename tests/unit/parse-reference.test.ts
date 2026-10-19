// src/nav/parseReference.ts (mw-5r3p30.622): what the 'Choose a book' search (and every other field that takes a place) makes of what he typed. A reference
// ('John 18:36', 'jn18', 'Ps 23') is a place; a book's name alone is not (it filters the list); a chapter past the book's end says how many it has.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPlace } from '../../src/nav/parseReference';

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
