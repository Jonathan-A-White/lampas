// tests/unit/audio-bible.test.ts — src/resources/audioBible.ts: the audio Bibles a reader can turn on and the chapter Audible is told to pick.
import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { OT_BOOKS } from '../../src/data/otBooks';
import { AUDIO_BIBLES, audibleChapterLabel, audioBibleOf } from '../../src/resources/audioBible';

describe('audibleChapterLabel', () => {
  it('is the NKJV book name and the chapter, for every book of the Bible', () => {
    const all = [...BOOKS, ...OT_BOOKS];
    expect(all).toHaveLength(66);
    for (const book of all) {
      expect(audibleChapterLabel(book.code, 1)).toBe(`${book.name} 1`);
      expect(audibleChapterLabel(book.code, book.chapters)).toBe(`${book.name} ${book.chapters}`);
    }
    expect(audibleChapterLabel('sng', 2)).toBe('Song of Solomon 2');
    expect(audibleChapterLabel('rev', 22)).toBe('Revelation 22');
    expect(audibleChapterLabel('luk', 15)).toBe('Luke 15');
  });

  it('names nothing for a book that is not in either list', () => {
    expect(audibleChapterLabel('xyz', 1)).toBeUndefined();
  });
});

describe('the audio Bibles', () => {
  it('start with The Word of Promise, in Audible', () => {
    expect(AUDIO_BIBLES.map((b) => b.id)).toEqual(['word-of-promise']);
    const [bible] = AUDIO_BIBLES;
    expect(audioBibleOf('word-of-promise')).toBe(bible);
    expect(audioBibleOf('off')).toBeUndefined();
    expect(bible.pageUrl).toBe('https://www.audible.com/pd/B003UC45I8');
    expect(bible.intentUrl).toContain('package=com.audible.application');
  });
});
