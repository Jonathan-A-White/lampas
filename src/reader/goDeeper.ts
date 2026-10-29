// src/reader/goDeeper.ts — what the variant sheet's 'Go deeper' holds (mw-9ji6ek0.20, src/reader/VariantSheet.tsx): the lessons, the apparatus file of the unit's book, the 2005 edition's scan
// and the place its Logos door opens at. Pure: the sheet draws them. The apparatus is the one the data was built from (scripts/data/variants.ts: tag and directory); a test holds the two together.
import { bookOf } from '../data/books';
import { entriesOf, type CatalogueEntry } from '../resources/catalogue';
import type { StudyPlace } from '../resources/types';

export const GO_DEEPER_HEADING = 'Go deeper';
export const LESSONS_LABEL = 'Lessons on variant readings ›';
export const APPARATUS_LABEL = 'The apparatus: Robinson-Pierpont 2018 (GitHub)';
export const LOGOS_LABEL = 'In your Logos library…';

/** The scan of the 2005 edition with its introduction (the Preface's link to it, src/preface.ts). */
export const EDITION_2005 = {
  label: 'The 2005 edition and its introduction',
  url: 'https://archive.org/details/RP2005KoineGreekNTinByzantineTextform',
} as const;

const APPARATUS_BASE = 'https://github.com/byztxt/byzantine-majority-text/blob/v3.3.2/csv-unicode/ccat/with-variants';

/** The with-variants file of each book the data build reads, by our code (scripts/data/variants.ts VARIANTS_FILES). */
const FILES: Readonly<Record<string, string>> = {
  mat: 'MAT', mrk: 'MAR', luk: 'LUK', jhn: 'JOH', act: 'ACT', rom: 'ROM', '1co': '1CO', '2co': '2CO', gal: 'GAL', eph: 'EPH', php: 'PHP',
  col: 'COL', '1th': '1TH', '2th': '2TH', '1ti': '1TI', '2ti': '2TI', tit: 'TIT', phm: 'PHM', heb: 'HEB', jas: 'JAM', '1pe': '1PE',
  '2pe': '2PE', '1jn': '1JO', '2jn': '2JO', '3jn': '3JO', jud: 'JUD', rev: 'REV',
};

/** The page of the book's file on GitHub at the tag v3.3.2; undefined for a book the apparatus does not cover. */
export function apparatusUrl(book: string): string | undefined {
  const file = FILES[book];
  return file ? `${APPARATUS_BASE}/${file}.csv` : undefined;
}

/** The Logos door is offered the Greek texts only (the SBLGNT apparatus, the Greek New Testaments): the question is which words, not what a commentary says. */
export const GO_DEEPER_ENTRIES: readonly CatalogueEntry[] = entriesOf('greek-text');

/** The unit's place, and how it is written: 'Revelation 3:2'. */
export function goDeeperPlace(book: string, chapter: number, verse: number): { place: StudyPlace; name: string } {
  return { place: { book, chapter, verse }, name: `${bookOf(book)?.name ?? book} ${chapter}:${verse}` };
}
