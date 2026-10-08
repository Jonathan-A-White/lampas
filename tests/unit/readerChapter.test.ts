import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { chapterOf, DEFAULT_CHAPTER, getOpenChapter, setOpenChapter } from '../../src/data/readerChapter';
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
    await db.words.put({ lemma: 'ἀγάπη', lemmas: [], gloss: 'love', lesson: 1, state: 'learning', since: 0 });
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
