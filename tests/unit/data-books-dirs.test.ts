import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dataBooks, GREEK_BOOKS, isGreekBook, NOT_BOOKS } from '../support/dataBooks';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}, HOOK_TIMEOUT_MS);

describe('dataBooks: the book directories of a data folder', () => {
  it('returns jhn only from a folder holding jhn/, ladder/, audio/ and index.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'data-books-'));
    made.push(root);
    for (const dir of ['jhn', 'ladder', 'audio']) mkdirSync(join(root, dir));
    writeFileSync(join(root, 'index.json'), '{"books":[{"code":"jhn"}]}');
    writeFileSync(join(root, 'verses-jhn-1.json'), '[]');
    expect(dataBooks(root)).toEqual(['jhn']);
  });

  it('names every book of the real public/data and none of its other directories', () => {
    const books = dataBooks();
    expect(books).toContain('jhn');
    expect(books).toContain('gen');
    expect(books).not.toContain('ladder');
    expect(books).not.toContain('audio');
    expect(books).toHaveLength(66);
  });
});

describe('the Greek books of the data, from the same helper file (mw-82lb97i.11)', () => {
  const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: { code: string; lang?: string }[] };
  const langOf = (code: string): string | undefined => index.books.find((b) => b.code === code)?.lang;

  it('isGreekBook is true of jhn and false of gen, which index.json reads in Hebrew', () => {
    expect(langOf('gen')).toBe('hbo');
    expect(isGreekBook('jhn')).toBe(true);
    expect(isGreekBook('gen')).toBe(false);
  });

  it('isGreekBook is false of a directory that is no book, and of a code the index does not hold', () => {
    for (const dir of NOT_BOOKS) expect(isGreekBook(dir), dir).toBe(false);
    expect(isGreekBook('xyz')).toBe(false);
  });

  it('GREEK_BOOKS holds the 27 books index.json does not read in Hebrew, each with its code and chapters, in the index order', () => {
    const greek = index.books.filter((b) => b.lang !== 'hbo').map((b) => b.code);
    expect(GREEK_BOOKS.map((b) => b.code)).toEqual(greek);
    expect(GREEK_BOOKS).toHaveLength(27);
    expect(GREEK_BOOKS.find((b) => b.code === 'jhn')?.chapters).toBe(21);
    for (const book of GREEK_BOOKS) expect(dataBooks(), book.code).toContain(book.code);
  });
});

describe('tests/support: no two helper files with one name', () => {
  // data-books.ts (isGreekBook) stood beside dataBooks.ts (dataBooks) until mw-82lb97i.11: an import of one read as an import of the other.
  it('holds no two files whose names differ only by hyphens, underscores or case', () => {
    const plain = (name: string): string =>
      name
        .replace(/\.[a-z]+$/i, '')
        .replace(/[-_]/g, '')
        .toLowerCase();
    const byName = new Map<string, string[]>();
    for (const entry of readdirSync('tests/support', { withFileTypes: true, recursive: true })) {
      if (!entry.isFile()) continue;
      byName.set(plain(entry.name), [...(byName.get(plain(entry.name)) ?? []), entry.name]);
    }
    const twins = [...byName.values()].filter((names) => names.length > 1).map((names) => names.sort().join(' and '));
    expect(twins).toEqual([]);
  });
});
