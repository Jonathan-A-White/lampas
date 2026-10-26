// tests/unit/audio-bible.test.ts — src/resources/audioBible.ts: the audio Bibles a reader can turn on and the chapter Audible is told to pick.
import { describe, expect, it } from 'vitest';
import { BOOKS, NT_BOOKS } from '../../src/data/books';
import { wordOfPromiseStart } from 'audible-kit';
import { AUDIO_BIBLES, audibleChapterLabel, audibleListen, audibleStartOf, audioBibleOf } from '../../src/resources/audioBible';

/** Audible's own titles that are not the Bible's name for the book and the chapter (the catalogue says 'Psalm 23', 'Revelations 22', 'The Book of Obadiah'). */
const AUDIBLES_OWN = new Set(['psa', 'rev', 'oba', 'phm', '2jn', '3jn', 'jud']);

describe('audibleChapterLabel', () => {
  it('is the NKJV book name and the chapter, for every book of the Bible that Audible names that way', () => {
    const all = BOOKS;
    expect(all).toHaveLength(66);
    for (const book of all.filter((b) => !AUDIBLES_OWN.has(b.code))) {
      expect(audibleChapterLabel(book.code, 1)).toBe(`${book.name} 1`);
      expect(audibleChapterLabel(book.code, book.chapters)).toBe(`${book.name} ${book.chapters}`);
    }
    expect(audibleChapterLabel('sng', 2)).toBe('Song of Solomon 2');
    expect(audibleChapterLabel('luk', 15)).toBe('Luke 15');
    expect(audibleChapterLabel('1jn', 1)).toBe('1 John 1');
  });

  it("is Audible's own title where Audible does not use the Bible's name (mw-5r3p30.412)", () => {
    expect(audibleChapterLabel('psa', 23)).toBe('Psalm 23');
    expect(audibleChapterLabel('rev', 22)).toBe('Revelations 22');
    expect(audibleChapterLabel('oba', 1)).toBe('The Book of Obadiah');
    expect(audibleChapterLabel('phm', 1)).toBe('The Epistle of Paul the Apostle to Philemon');
    expect(audibleChapterLabel('2jn', 1)).toBe('The Second Epistle of John');
    expect(audibleChapterLabel('3jn', 1)).toBe('The Third Epistle of John');
    expect(audibleChapterLabel('jud', 1)).toBe('The Epistle of Jude');
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

describe('audibleStartOf', () => {
  it("is the chapter's start in the live catalogue, not the research mirror's (mw-5r3p30.451)", () => {
    expect(audibleStartOf('luk', 15)).toBe(300423039);
    expect(audibleStartOf('luk', 14)).toBe(300118626);
    expect(audibleStartOf('jhn', 3)).toBe(305111142);
  });

  it("has a start for every one of the 260 chapters of the New Testament, and for the Old Testament's Psalm 23 too", () => {
    let count = 0;
    for (const book of NT_BOOKS) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        count++;
        const start = audibleStartOf(book.code, chapter);
        expect(start, `${book.name} ${chapter}`).toBeTypeOf('number');
        // The Word of Promise opens with its credits, so no chapter starts at 0
        expect(start).toBeGreaterThan(0);
      }
    }
    expect(count).toBe(260);
    for (const [code, chapter] of [['psa', 23], ['rev', 22], ['oba', 1], ['jud', 1], ['phm', 1], ['2jn', 1], ['3jn', 1]] as const) {
      expect(audibleStartOf(code, chapter), `${code} ${chapter}`).toBeTypeOf('number');
    }
  });

  it("agrees with audible-kit's Word of Promise data for every chapter of the Bible", () => {
    for (const book of BOOKS) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        expect(audibleStartOf(book.code, chapter), `${book.name} ${chapter}`).toBe(wordOfPromiseStart(book.name, chapter));
      }
    }
  });

  it('is undefined for a book or a chapter that is not there', () => {
    expect(audibleStartOf('xyz', 1)).toBeUndefined();
    expect(audibleStartOf('luk', 25)).toBeUndefined();
    expect(audibleStartOf('luk', 0)).toBeUndefined();
  });

  it("is in order: each chapter starts after the one before it, across the books", () => {
    const all = BOOKS;
    let last = -1;
    for (const book of all) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        const start = audibleStartOf(book.code, chapter) ?? -1;
        expect(start, `${book.name} ${chapter}`).toBeGreaterThan(last);
        last = start;
      }
    }
  });
});

describe('audibleListen', () => {
  const [bible] = AUDIO_BIBLES;

  it("is Audible's own smart link at the chapter's start, with the time of the tap (Luke 15)", () => {
    expect(audibleListen(bible, 'luk', 15, 1760000000000)).toEqual({
      href:
        'https://audible.smart.link/aexglzp2n?annotation_time_utc=1760000000000&asin=B003UC45I8&autoplay=true&content_delivery_type=MultiPartBook' +
        '&device_id=device_id&marketplace_domain=.com&position_from_start=300423039&site_id=1&source_code=Deep-link_Banner',
    });
  });

  it('carries a later tap time when asked later', () => {
    expect(audibleListen(bible, 'luk', 15, 1760000000001)?.href).toContain('annotation_time_utc=1760000000001&');
  });

  it("falls back to today's search intent and the book's page when no start is known", () => {
    expect(audibleListen(bible, 'xyz', 1, 1760000000000)).toEqual({ href: bible.intentUrl, fallback: bible.pageUrl });
  });
});
