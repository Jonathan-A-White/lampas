import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOOKS, NT_BOOKS, OT_BOOKS, bookOf, ntBookOf, otBookOf, titleOf } from '../../src/data/books';
import { CANON, canonBookOf } from '../../src/data/canon';
import type { BookIndex } from '../../src/data/chapter';

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;

describe('the canon of 66 books', () => {
  it('is the 66 of public/data/index.json, by code, name, chapter count and language, in canon order', () => {
    expect(CANON).toHaveLength(66);
    expect(CANON.map(({ code, name, chapters, lang }) => ({ code, name, chapters, lang }))).toEqual(
      index.books.map((b) => ({ code: b.code, name: b.name, chapters: b.chapters, lang: b.lang })),
    );
    expect(CANON[0].name).toBe('Genesis');
    expect(CANON[38].name).toBe('Malachi');
    expect(CANON[39].name).toBe('Matthew');
    expect(CANON[65].name).toBe('Revelation');
    expect(CANON.reduce((n, b) => n + b.chapters, 0)).toBe(1189);
  });

  it('reads the 39 books of the Old Testament in Hebrew and the 27 of the New in Greek, each with its Logos abbreviation', () => {
    expect(CANON.filter((b) => b.lang === 'hbo').map((b) => b.code)).toEqual(OT_BOOKS.map((b) => b.code));
    expect(CANON.filter((b) => b.lang === 'grc')).toHaveLength(27);
    expect(canonBookOf('gen')?.logos).toBe('Ge');
    expect(canonBookOf('rom')?.logos).toBe('Ro');
    expect(CANON.every((b) => b.logos.length > 0)).toBe(true);
    expect(canonBookOf('nope')).toBeUndefined();
  });
});

describe('BOOKS, the canon the readers take', () => {
  it('is the 66 of the index, by code, name, chapter count and language, each with its Logos abbreviation', () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS.map(({ code, name, chapters, lang }) => ({ code, name, chapters, lang }))).toEqual(
      index.books.map((b) => ({ code: b.code, name: b.name, chapters: b.chapters, lang: b.lang })),
    );
    expect(BOOKS.every((b) => b.logos.length > 0)).toBe(true);
    expect(BOOKS[0].name).toBe('Genesis');
    expect(BOOKS[65].name).toBe('Revelation');
  });

  it('has the New Testament as NT_BOOKS and the Old as OT_BOOKS, two views of it', () => {
    expect(NT_BOOKS).toHaveLength(27);
    expect(OT_BOOKS).toHaveLength(39);
    expect(NT_BOOKS.map((b) => b.code)).toEqual(index.books.filter((b) => b.lang === 'grc').map((b) => b.code));
    expect(OT_BOOKS.map((b) => b.code)).toEqual(index.books.filter((b) => b.lang === 'hbo').map((b) => b.code));
    expect([...OT_BOOKS, ...NT_BOOKS]).toEqual(BOOKS);
    expect(NT_BOOKS[0].name).toBe('Matthew');
    expect(OT_BOOKS[38].name).toBe('Malachi');
  });

  it('names a book of either testament, and the Old Testament by its Logos abbreviation too', () => {
    expect(bookOf('gen')).toMatchObject({ name: 'Genesis', lang: 'hbo', logos: 'Ge', chapters: 50 });
    expect(bookOf('rom')).toMatchObject({ name: 'Romans', lang: 'grc', logos: 'Ro' });
    expect(bookOf('nope')).toBeUndefined();
    expect(ntBookOf('gen')).toBeUndefined();
    expect(ntBookOf('rom')?.name).toBe('Romans');
    expect(otBookOf('jon')?.name).toBe('Jonah');
    expect(otBookOf('rom')).toBeUndefined();
  });

  it('gives the title of a chapter', () => {
    expect(titleOf('rom', 8)).toBe('Romans 8');
    expect(titleOf('1jn', 1)).toBe('1 John 1');
    expect(titleOf('jon', 1)).toBe('Jonah 1');
  });
});
