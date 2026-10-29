// src/lessons/variants/index.ts — the five short lessons on variant readings (mw-9ji6ek0.17), written for Lampas from public-domain sources only:
// the Robinson-Pierpont 2005 and 2018 prefaces, the 2018 apparatus (byztxt v3.3.2), Robinson's essay and the Majority Standard Bible; other scholars are
// named as further reading, never quoted. Each page says what each side holds and never rules on which reading is right (the Preface's line).
// The pages are Markdown, read as text with `?raw`; a screen that shows them imports this module lazily, so they come in their own chunk.
import whatAVariantIs from './01-what-a-variant-is.md?raw';
import whyManuscriptsDiffer from './02-why-manuscripts-differ.md?raw';
import byzantineNaEcm from './03-byzantine-na-ecm.md?raw';
import howToReadAVariant from './04-how-to-read-a-variant.md?raw';
import whenItMatters from './05-when-it-matters.md?raw';

export interface VariantLesson {
  id: string;
  /** the page's first heading, without its '# ' */
  title: string;
  /** 1 to 5, the order they are read in */
  order: number;
  /** the file in this folder */
  file: string;
  markdown: string;
}

/**
 * Every address a lesson may link to, and no other (tests/unit/variant-lessons.test.ts): each was fetched once and answered 200 before it went in,
 * and the story's closing comment lists them. A new link is added here, checked with curl first.
 */
export const VARIANT_LESSON_SOURCES: readonly string[] = [
  'https://byzantinetext.com/study/editions/robinson-pierpont/',
  'https://byzantinetext.com/wp-content/uploads/2016/11/editions-rp-01-preface.pdf',
  'https://byzantinetext.com/wp-content/uploads/2016/11/editions-rp-11-appendix.pdf',
  'https://byzantinetext.com/wp-content/uploads/2021/03/robinson-pierpont-2018-gnt-edition.pdf',
  'https://archive.org/details/RP2005KoineGreekNTinByzantineTextform',
  'https://github.com/byztxt/byzantine-majority-text',
  'https://github.com/byztxt/byzantine-majority-text/tree/v3.3.2/csv-unicode/ccat/with-variants',
  'https://majoritybible.com/',
  'https://github.com/Jonathan-A-White/lampas/blob/main/docs/data.md#variants',
  'https://github.com/Jonathan-A-White/lampas/blob/main/docs/data.md#variant-english',
];

export const VARIANT_LESSONS: VariantLesson[] = [
  { id: 'what-a-variant-is', title: 'What a variant is', order: 1, file: '01-what-a-variant-is.md', markdown: whatAVariantIs },
  { id: 'why-manuscripts-differ', title: 'Why manuscripts differ', order: 2, file: '02-why-manuscripts-differ.md', markdown: whyManuscriptsDiffer },
  { id: 'byzantine-na-ecm', title: 'Byzantine, Nestle-Aland and ECM', order: 3, file: '03-byzantine-na-ecm.md', markdown: byzantineNaEcm },
  { id: 'how-to-read-a-variant', title: 'How to read a variant', order: 4, file: '04-how-to-read-a-variant.md', markdown: howToReadAVariant },
  { id: 'when-it-matters', title: 'When it matters', order: 5, file: '05-when-it-matters.md', markdown: whenItMatters },
];
