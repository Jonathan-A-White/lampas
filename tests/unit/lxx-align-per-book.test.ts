// tests/unit/lxx-align-per-book.test.ts — a book's pairing pass writes only its own book's files, so passes on different books run side by side (story mw-u2w5klk.349.99; the Governor, Talk 235f05be turn 1:
// "tell me something that would allow me to get more Septuagint books through faster"). The two files every pass used to write, tests/unit/lxx-align-choose.test.ts and docs/lxx-align.md, hold only what is
// about no one book; a book's real-data tests are tests/unit/lxx-align-choose-<code>.test.ts and its notes docs/lxx-align/<code>-notes.txt (hand-kept, beside the generated <code>.txt).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOCS = join('docs', 'lxx-align');
const UNIT = join('tests', 'unit');
const text = (path: string): string => readFileSync(path, 'utf8');
const books = (): string[] => readdirSync(DOCS).flatMap((f) => (/^[1-3a-z]{3}\.txt$/.test(f) ? [f.slice(0, 3)] : []));

describe('the shared test file is about no one book', () => {
  const shared = text(join(UNIT, 'lxx-align-choose.test.ts'));

  it('ships no book and reads no book\'s model files: that is a book\'s own file', () => {
    expect(shared, 'a book\'s ship belongs in tests/unit/lxx-align-choose-<code>.test.ts').not.toMatch(/\brunShip\(/);
    expect(shared).not.toMatch(/alignFileChapters\(/);
    expect(shared).not.toMatch(/describe(\.skipIf\([^)]*\))?\('[A-Z][a-z]+ with the model pass'/);
  });

  it('has a file of its own for each book, and each is for a book the report holds', () => {
    const own = readdirSync(UNIT).filter((f) => /^lxx-align-choose-[1-3a-z]{3}\.test\.ts$/.test(f));
    expect(own.length).toBeGreaterThanOrEqual(2);
    for (const f of own) expect(books(), f).toContain(f.slice('lxx-align-choose-'.length, 'lxx-align-choose-'.length + 3));
  });
});

describe('docs/lxx-align.md is about no one book\'s pass', () => {
  const doc = text('docs/lxx-align.md');

  it('holds no batch paragraph of a book: each is in its book\'s notes file', () => {
    expect(doc.match(/were done as one batch/g)).toBeNull();
    expect(doc).not.toMatch(/still to do/);
    expect(doc).toContain('docs/lxx-align/<code>-notes.txt');
  });

  it('says in "A pairing pass" where a book\'s pass writes its notes and its tests', () => {
    const pass = doc.slice(doc.indexOf('## A pairing pass'), doc.indexOf('## The unpaired English'));
    expect(pass).toContain('docs/lxx-align/<code>-notes.txt');
    expect(pass).toContain('tests/unit/lxx-align-choose-<code>.test.ts');
    expect(pass).toMatch(/never to docs\/lxx-align\.md or the shared test file/);
  });
});

describe('a book\'s notes file', () => {
  it('sits beside the book\'s generated file, which `lxx:align-expect` never rewrites, and holds what its passes did', () => {
    const notes = readdirSync(DOCS).filter((f) => /-notes\.txt$/.test(f));
    expect(notes, 'Genesis and Exodus had batch paragraphs').toEqual(expect.arrayContaining(['exo-notes.txt', 'gen-notes.txt']));
    for (const f of notes) {
      const code = f.slice(0, 3);
      expect(existsSync(join(DOCS, `${code}.txt`)), `${f} has no ${code}.txt beside it`).toBe(true);
      expect(text(join(DOCS, f)), f).toMatch(/^[A-Za-z0-9 ]+: what its pairing passes did \(hand-kept/);
    }
  });
});
