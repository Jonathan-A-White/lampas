import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOOKS, bookOf, titleOf } from '../../src/data/books';
import type { BookIndex } from '../../src/data/chapter';

describe('the books of the New Testament', () => {
  it('are the 27 of public/data/index.json, by code, name and chapter count, in canonical order', () => {
    const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
    expect(BOOKS).toHaveLength(27);
    expect(BOOKS).toEqual(index.books.map((b) => ({ code: b.code, name: b.name, chapters: b.chapters })));
    expect(BOOKS[0].name).toBe('Matthew');
    expect(BOOKS[26].name).toBe('Revelation');
  });

  it('give the title of a chapter', () => {
    expect(titleOf('rom', 8)).toBe('Romans 8');
    expect(titleOf('1jn', 1)).toBe('1 John 1');
    expect(bookOf('nope')).toBeUndefined();
  });
});
