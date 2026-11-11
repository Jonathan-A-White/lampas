import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dataBooks } from '../support/dataBooks';
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
