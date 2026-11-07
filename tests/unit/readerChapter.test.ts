import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { chapterOf, DEFAULT_CHAPTER, getBookOpens, getLastChapters, getLastVerse, getOpenChapter, setLastVerse, setOpenChapter } from '../../src/data/readerChapter';
import { countDue, ensureScheduled, listDue } from '../../src/data/repositories/reviews';

beforeEach(() => localStorage.clear());

describe('the chapter the Reader has open', () => {
  it('is Romans 8 on a fresh install', () => {
    expect(getOpenChapter()).toEqual({ book: 'rom', chapter: 8, title: 'Romans 8' });
    expect(DEFAULT_CHAPTER.title).toBe('Romans 8');
  });

  it('is remembered', () => {
    setOpenChapter('1jn', 1);
    expect(getOpenChapter()).toEqual({ book: '1jn', chapter: 1, title: '1 John 1' });
  });

  it('falls back to Romans 8 when what was kept cannot be read or is not a chapter', () => {
    localStorage.setItem('lampas.chapter', 'not json');
    expect(getOpenChapter()).toEqual(DEFAULT_CHAPTER);
    localStorage.setItem('lampas.chapter', JSON.stringify({ book: 'xyz', chapter: 1 }));
    expect(getOpenChapter()).toEqual(DEFAULT_CHAPTER);
    localStorage.setItem('lampas.chapter', JSON.stringify({ book: '1jn', chapter: 0 }));
    expect(getOpenChapter()).toEqual(DEFAULT_CHAPTER);
  });

  it('names a chapter only for a real book and a whole chapter number', () => {
    expect(chapterOf('jud', 1)?.title).toBe('Jude 1');
    expect(chapterOf('jud', 1.5)).toBeUndefined();
    expect(chapterOf('jud', -1)).toBeUndefined();
    expect(chapterOf('', 1)).toBeUndefined();
  });

  it('takes no word or review row away: a word learned in Romans 8 stays due after he moves to 1 John', async () => {
    const NOW = Date.UTC(2026, 9, 8, 9, 0, 0);
    await db.open();
    await Promise.all([db.reviews.clear(), db.words.clear()]);
    await db.words.put({ lemma: 'ἀγάπη', lang: 'grc', lemmas: [], gloss: 'love', lesson: 1, state: 'learning', since: 0 });
    setOpenChapter('rom', 8);
    await ensureScheduled('word', ['ἀγάπη'], NOW);
    const before = await db.reviews.get(['word', 'ἀγάπη']);
    expect((await listDue('word', NOW)).map((r) => r.id)).toEqual(['ἀγάπη']);

    setOpenChapter('1jn', 1);
    expect(await db.reviews.get(['word', 'ἀγάπη'])).toEqual(before);
    expect((await listDue('word', NOW)).map((r) => r.id)).toEqual(['ἀγάπη']);
    expect(await countDue(NOW)).toBe(1);
  });
});

describe('the chapter last open in each book (mw-5r3p30.1146)', () => {
  it('is empty on a fresh install', () => {
    expect(getLastChapters()).toEqual({});
  });

  it('keeps, per book, the last chapter that was open, and a book read again takes the newer one', () => {
    setOpenChapter('exo', 6);
    setOpenChapter('gen', 1);
    expect(getLastChapters()).toEqual({ exo: 6, gen: 1 });
    setOpenChapter('exo', 7);
    expect(getLastChapters()).toEqual({ exo: 7, gen: 1 });
  });

  it('reads nothing from what cannot be read, and drops a book or chapter that is not real', () => {
    localStorage.setItem('lampas.lastChapters', 'not json');
    expect(getLastChapters()).toEqual({});
    localStorage.setItem('lampas.lastChapters', JSON.stringify({ exo: 6, xyz: 2, gen: 0, rom: 'x' }));
    expect(getLastChapters()).toEqual({ exo: 6 });
  });
});

describe('how often a chapter of each book is opened (mw-5r3p30.1147)', () => {
  it('is empty on a fresh install', () => {
    expect(getBookOpens()).toEqual({});
  });

  it('counts, per book, each time another chapter is opened, and survives being read again', () => {
    setOpenChapter('mrk', 1);
    setOpenChapter('mrk', 2);
    setOpenChapter('mat', 1);
    setOpenChapter('mrk', 3);
    expect(getBookOpens()).toEqual({ mrk: 3, mat: 1 });
  });

  it('does not count the chapter that is already open again (a reload, or the effect run twice)', () => {
    setOpenChapter('mrk', 1);
    setOpenChapter('mrk', 1);
    setOpenChapter('mrk', 1);
    expect(getBookOpens()).toEqual({ mrk: 1 });
    setOpenChapter('mat', 1);
    setOpenChapter('mrk', 1);
    expect(getBookOpens()).toEqual({ mrk: 2, mat: 1 });
  });

  it('counts the first open of Romans 8 on a fresh install, though Romans 8 is the default', () => {
    setOpenChapter('rom', 8);
    expect(getBookOpens()).toEqual({ rom: 1 });
  });

  it('reads nothing from what cannot be read, and drops a book that is not real or a count that is not a number', () => {
    localStorage.setItem('lampas.bookOpens', 'not json');
    expect(getBookOpens()).toEqual({});
    localStorage.setItem('lampas.bookOpens', JSON.stringify({ mrk: 4, xyz: 2, mat: 'x', jhn: -1 }));
    expect(getBookOpens()).toEqual({ mrk: 4 });
  });
});

describe('the verse last on top in each chapter (mw-5r3p30.1148)', () => {
  it('is none for a chapter never read, and keeps a verse per chapter', () => {
    expect(getLastVerse('gen', 1)).toBeUndefined();
    setLastVerse('gen', 1, 20);
    setLastVerse('exo', 1, 4);
    expect(getLastVerse('gen', 1)).toBe(20);
    expect(getLastVerse('exo', 1)).toBe(4);
    setLastVerse('gen', 1, 22);
    expect(getLastVerse('gen', 1)).toBe(22);
  });

  it('takes the note away for a chapter left at its top, and reads nothing from what cannot be read', () => {
    setLastVerse('gen', 1, 20);
    setLastVerse('gen', 1, null);
    expect(getLastVerse('gen', 1)).toBeUndefined();
    localStorage.setItem('lampas.lastVerses', 'not json');
    expect(getLastVerse('gen', 1)).toBeUndefined();
    localStorage.setItem('lampas.lastVerses', JSON.stringify({ 'gen/1': 0, 'gen/2': 'x', 'gen/3': 5 }));
    expect(getLastVerse('gen', 1)).toBeUndefined();
    expect(getLastVerse('gen', 3)).toBe(5);
  });
});
