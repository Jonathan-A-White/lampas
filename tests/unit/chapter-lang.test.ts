// A chapter says its source language and its translation (mw-uqlxea.1): the New Testament's files leave both out and loadChapter fills them.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_CHAPTER, chapterUrl, fillChapter, forgetChapters, loadCanonIndex, loadChapter, loadIndex, sourceLanguage, type BookIndex, type Chapter } from '../../src/data/chapter';
import { BOOK_INDEX, CANON_INDEX } from '../../src/data/bookIndex';

const file = (path: string): string => readFileSync(path, 'utf8');
const answer = (body: string) => vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(body)));

beforeEach(() => {
  forgetChapters();
  vi.unstubAllGlobals();
});

describe('the source language of a chapter', () => {
  it("is 'grc' for a New Testament file that says nothing, and loadChapter fills it with the translation", async () => {
    const raw = JSON.parse(file('public/data/rom/8.json')) as Record<string, unknown>;
    expect(raw.lang).toBeUndefined();
    expect(raw.translation).toBeUndefined();
    answer(file('public/data/rom/8.json'));
    const chapter = await loadChapter('rom', 8);
    expect(chapter.lang).toBe('grc');
    expect(chapter.translation).toBe('msb');
    expect(sourceLanguage(chapter)).toBe('grc');
  });

  it("is 'hbo' for an Old Testament file, which says it and its translation itself", async () => {
    const raw = JSON.parse(file('public/data/gen/1.json')) as { lang: string; translation: string };
    expect(raw.lang).toBe('hbo');
    expect(raw.translation).toBe('msb');
    answer(file('public/data/gen/1.json'));
    const chapter = await loadChapter('gen', 1);
    expect(sourceLanguage(chapter)).toBe('hbo');
    expect(chapter.verses[0].g).toHaveLength(7);
  });

  it("reads a chapter kept on a phone before the field, and the empty chapter, as 'grc'", () => {
    const old: Chapter = { book: 'Romans', code: 'rom', chapter: 8, lex: {}, parse: {}, verses: [] };
    expect(sourceLanguage(old)).toBe('grc');
    expect(fillChapter(old)).toMatchObject({ lang: 'grc', translation: 'msb' });
    expect(sourceLanguage(NO_CHAPTER)).toBe('grc');
  });
});

describe('the index of 66 books', () => {
  it('has the fingerprint of an Old Testament chapter, so it is asked for by it', () => {
    expect(chapterUrl('gen', 1)).toMatch(/^\/data\/gen\/1\.json\?v=[0-9a-f]{12}$/);
  });

  it("gives every reader the 27 books of the New Testament until mw-uqlxea.2, and the canon its 66", async () => {
    expect(CANON_INDEX.books).toHaveLength(66);
    expect(BOOK_INDEX.books).toHaveLength(27);
    expect(BOOK_INDEX.books.every((b) => b.lang === 'grc')).toBe(true);
    answer(file('public/data/index.json'));
    expect((await loadIndex()).books.map((b) => b.code)).toEqual(BOOK_INDEX.books.map((b) => b.code));
    expect((await loadCanonIndex()).books).toHaveLength(66);
  });

  it('reads an index from before the Old Testament, with no lang, as the New Testament', async () => {
    const old: BookIndex = { books: [{ code: 'rom', name: 'Romans', chapters: 16, verses: [32], fingerprints: [''] }] };
    answer(JSON.stringify(old));
    expect((await loadIndex()).books.map((b) => b.code)).toEqual(['rom']);
  });
});
