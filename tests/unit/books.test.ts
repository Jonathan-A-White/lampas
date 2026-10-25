import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOOKS, bookOf, titleOf } from '../../src/data/books';
import { CANON, canonBookOf } from '../../src/data/canon';
import type { BookIndex } from '../../src/data/chapter';
import { OT_BOOKS } from '../../src/data/otBooks';

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

describe('the books of the New Testament', () => {
  it('are the 27 of the canon that read in Greek, by code, name and chapter count, in canonical order', () => {
    expect(BOOKS).toHaveLength(27);
    expect(BOOKS).toEqual(index.books.filter((b) => b.lang === 'grc').map((b) => ({ code: b.code, name: b.name, chapters: b.chapters })));
    expect(BOOKS[0].name).toBe('Matthew');
    expect(BOOKS[26].name).toBe('Revelation');
  });

  it('give the title of a chapter', () => {
    expect(titleOf('rom', 8)).toBe('Romans 8');
    expect(titleOf('1jn', 1)).toBe('1 John 1');
    expect(bookOf('nope')).toBeUndefined();
    expect(bookOf('gen')).toBeUndefined();
  });
});
