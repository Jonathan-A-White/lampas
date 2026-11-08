// tests/unit/septuagint-headings.test.ts — mw-u2w5klk.302: a Septuagint chapter has no section headings of its own (Swete and Brenton carry none), so the MSB's headings, read at run time from the
// Lampas chapter's own file (public/data/<book>/<n>.json), are laid on the Greek verse that answers the verse each heads, by the verse's `ref` (STEPBible's TVTMS, scripts/data/tvtms.ts). A heading whose
// Lampas verse no Greek verse begins is left out: it is never put on a verse it does not head.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { loadChapter, type Chapter, type Verse, type VerseRef } from '../../src/data/chapter';
import { withHeadings } from '../../src/data/lxxChapter';
import { septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  stubChapterFetch();
});
afterEach(() => vi.unstubAllGlobals());

const refOf = (book: string, chapter: number, verse: number): VerseRef => ({ book, chapter, verse });
const greekVerse = (n: number, ref: Verse['ref'], refs?: VerseRef[]): Verse => ({ n, ref, ...(refs ? { refs } : {}), g: [], e: [{ t: `Brenton ${n}`, g: [] }] });
const chapterOf = (verses: Verse[], chapter: number): Chapter => ({ book: 'Jeremiah', code: 'jer', chapter, lang: 'grc', edition: 'swete', lex: {}, parse: {}, verses });
const msb = (verses: Array<[number, string | undefined]>): Pick<Chapter, 'verses'> => ({ verses: verses.map(([n, h]) => ({ n, ...(h ? { h } : {}), g: [], e: [] })) });

describe('Psalm 23, which is Greek Psalm 22', () => {
  beforeEach(() => setSetting(septuagintSetting, 'on'));

  it("carries the MSB's heading on Greek verse 1, the verse that answers Lampas's Psalm 23:1, and on no other", async () => {
    const chapter = await loadChapter('psa', 23);
    expect(chapter).toMatchObject({ code: 'psa', chapter: 22, edition: 'swete' });
    expect(chapter.verses.map((v) => v.h)).toEqual(['The LORD Is My Shepherd', undefined, undefined, undefined, undefined, undefined]);
  });

  it("puts Psalm 10's heading on Greek 9:22, the verse that answers Psalm 10:1, not on Greek verse 1 of the file", async () => {
    const chapter = await loadChapter('psa', 10);
    expect(chapter.verses.map((v) => [v.n, v.h])).toEqual([
      [22, 'The Perils of the Pilgrim'],
      [23, undefined],
    ]);
  });

  it('shows no heading, and still opens the chapter, when the Lampas chapter cannot be fetched', async () => {
    const base = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (String(input).startsWith('/data/psa/') ? new Response('', { status: 500 }) : base(input))));
    const chapter = await loadChapter('psa', 23);
    expect(chapter).toMatchObject({ chapter: 22, edition: 'swete' });
    expect(chapter.verses.some((v) => v.h !== undefined)).toBe(false);
  });
});

describe("a chapter whose numbering differs from the MSB's (Jeremiah 46 is Greek 26)", () => {
  // an invented Greek Jeremiah 26 laid on Lampas 46: Greek 1 answers 46:2, Greek 3 answers 46:4 to 46:6 together, Greek 5 answers no Lampas verse; the Greek verse numbers are not the Lampas ones
  const greek = chapterOf(
    [
      greekVerse(1, refOf('jer', 46, 2)),
      greekVerse(2, refOf('jer', 46, 3)),
      greekVerse(3, refOf('jer', 46, 4), [refOf('jer', 46, 4), refOf('jer', 46, 5), refOf('jer', 46, 6)]),
      greekVerse(4, refOf('jer', 46, 7)),
      greekVerse(5, 'none'),
      greekVerse(6, refOf('jer', 46, 13)),
    ],
    26,
  );

  it("lays a heading on the Greek verse that answers the Lampas verse it heads, and leaves it out where no Greek verse answers that verse", () => {
    const got = withHeadings(greek, msb([[1, 'Judgment on Egypt'], [2, 'Pharaoh Necho at Carchemish'], [7, 'Egypt Overthrown'], [13, 'Nebuchadnezzar to Strike Egypt']]), 'jer', 46);
    // Lampas 46:1 has no Greek verse (left out); 46:2 is Greek 1, 46:7 is Greek 4, 46:13 is Greek 6
    expect(got.verses.map((v) => [v.n, v.h])).toEqual([
      [1, 'Pharaoh Necho at Carchemish'],
      [2, undefined],
      [3, undefined],
      [4, 'Egypt Overthrown'],
      [5, undefined],
      [6, 'Nebuchadnezzar to Strike Egypt'],
    ]);
  });

  it("does not put a heading on a Greek verse that begins before the verse it heads (46:5 is in the middle of Greek 3)", () => {
    const got = withHeadings(greek, msb([[4, 'Heads the first of Greek 3'], [5, 'Heads the middle of Greek 3']]), 'jer', 46);
    expect(got.verses.map((v) => v.h)).toEqual([undefined, undefined, 'Heads the first of Greek 3', undefined, undefined, undefined]);
  });

  it('gives a heading to one Greek verse only when two Greek verses answer the same Lampas verse (the first)', () => {
    const twice = chapterOf([greekVerse(1, refOf('jer', 46, 2)), greekVerse(2, refOf('jer', 46, 2))], 26);
    expect(withHeadings(twice, msb([[2, 'Once']]), 'jer', 46).verses.map((v) => v.h)).toEqual(['Once', undefined]);
  });

  it("never reads a verse of another Lampas chapter: a Greek verse answering Jeremiah 45:2 is not 46:2", () => {
    const other = chapterOf([greekVerse(1, refOf('jer', 45, 2)), greekVerse(2, refOf('jer', 46, 2))], 26);
    expect(withHeadings(other, msb([[2, 'Heading']]), 'jer', 46).verses.map((v) => v.h)).toEqual([undefined, 'Heading']);
  });

  it("leaves the chapter as it is when the MSB's chapter is not there, or has no headings", () => {
    expect(withHeadings(greek, null, 'jer', 46)).toBe(greek);
    expect(withHeadings(greek, msb([[2, undefined]]), 'jer', 46)).toBe(greek);
  });

  it("keeps a verse of a chapter that has no `ref` (a file the index disagrees with) without a heading", () => {
    const bare = chapterOf([{ n: 1, g: [], e: [] }], 26);
    expect(withHeadings(bare, msb([[1, 'Heading']]), 'jer', 46).verses[0].h).toBeUndefined();
  });
});
