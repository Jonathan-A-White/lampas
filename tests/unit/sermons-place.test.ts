// src/sermons/place.ts (mw-qtu3zvz.2): the place the Verse view's Sermons door is asked for: a verse, a passage, the whole chapter; a Septuagint chapter by the Lampas verses its Greek verses answer.
import { describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { sermonPlaceOf } from '../../src/sermons/place';

const verse = (n: number, ref?: Verse['ref'], refs?: Verse['refs']): Verse => ({ n, g: [], e: [], ...(ref === undefined ? {} : { ref }), ...(refs === undefined ? {} : { refs }) }) as Verse;
const chapterOf = (edition: string | undefined, verses: Verse[]): Pick<Chapter, 'edition' | 'verses'> => ({ edition, verses }) as Pick<Chapter, 'edition' | 'verses'>;

describe('sermonPlaceOf', () => {
  const rom = chapterOf(undefined, [verse(1), verse(2), verse(3)]);

  it('is a verse, a passage or, for the whole chapter, the chapter alone', () => {
    expect(sermonPlaceOf(rom, { n: 2 }, 'rom', 5, false)).toEqual({ book: 'rom', chapter: 5, from: 2 });
    expect(sermonPlaceOf(rom, { n: 1, to: 3 }, 'rom', 5, false)).toEqual({ book: 'rom', chapter: 5, from: 1, to: 3 });
    expect(sermonPlaceOf(rom, { n: 1, to: 3 }, 'rom', 5, true)).toEqual({ book: 'rom', chapter: 5 });
  });

  describe('a Septuagint chapter', () => {
    // Greek Psalm 22 is Psalm 23: its verse 1 is a title Lampas has no verse for, verses 2 and 3 are Psalm 23:1 and 23:2, and verse 4 answers two Lampas verses
    const ref = (verseNumber: number) => ({ book: 'psa', chapter: 23, verse: verseNumber });
    const psalm = chapterOf('swete', [verse(1, 'none'), verse(2, ref(1)), verse(3, ref(2)), verse(4, ref(3), [ref(3), ref(4)])]);

    it('is asked for as the Lampas verses its Greek verses answer', () => {
      expect(sermonPlaceOf(psalm, { n: 2 }, 'psa', 23, false)).toEqual({ book: 'psa', chapter: 23, from: 1 });
      expect(sermonPlaceOf(psalm, { n: 2, to: 4 }, 'psa', 23, false)).toEqual({ book: 'psa', chapter: 23, from: 1, to: 4 });
    });

    it('is asked for as the chapter where the Greek verse has no Lampas verse, and for the whole chapter as ever', () => {
      expect(sermonPlaceOf(psalm, { n: 1 }, 'psa', 23, false)).toEqual({ book: 'psa', chapter: 23 });
      expect(sermonPlaceOf(psalm, { n: 1, to: 4 }, 'psa', 23, true)).toEqual({ book: 'psa', chapter: 23 });
    });
  });
});
