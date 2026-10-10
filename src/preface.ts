// src/preface.ts — what the Preface page says (mw-5r3p30.125): a few plain paragraphs about the text Lampas reads, and the sources it
// links to. Every address here was fetched and answered 200 before it went in (the story's closing comment lists each one).

/**
 * Which edition the Greek follows, and how we know (docs/greek-edition.md, made by `npm run greek:edition`, mw-5r3p30.136): the
 * table's Greek was compared word by word with both editions, and a test holds this line to that file's verdict.
 */
export const PREFACE_EDITION_LINE =
  'The Majority Standard Bible’s table does not say which edition its Greek is, so we compared it word by word with both. It is the 2005 edition: where the 2018 edition, which Robinson recommends in its place, changes a word (a few accents and capitals), the Greek in Lampas has the 2005 reading. Both editions are public domain.';

/** The paragraphs, in the app's voice: what the text is and who stands behind it, not an argument. */
export const PREFACE_PARAGRAPHS: string[] = [
  'The Greek you read in Lampas is the Byzantine Textform, edited by Maurice A. Robinson and William G. Pierpont and published in 2005 as The New Testament in the Original Greek. It is the form of the text found in the large majority of surviving Greek manuscripts, so it is often called the Majority text.',
  PREFACE_EDITION_LINE,
  'Robinson makes the case that this form of the text goes back to the earliest centuries and should be read as the original line of transmission, not as a late revision. Other scholars, who give most weight to the oldest manuscripts, read the evidence differently, and most modern Bibles follow them. Lampas does not settle that question. It tells you which text it uses and points you to the people who wrote about it.',
  'The English beside the Greek is the Majority Standard Bible, whose New Testament is translated from the same Robinson and Pierpont text. Its footnotes note where the modern critical texts read differently. The Robinson and Pierpont text and the Majority Standard Bible are both public domain.',
];

export interface PrefaceLink {
  /** the name the link carries */
  name: string;
  /** one line under it: what you will find there */
  about: string;
  url: string;
}

/** The sources, the Robinson essay first. The essay is only on an older site that answers on plain http. */
export const PREFACE_LINKS: PrefaceLink[] = [
  {
    name: 'Maurice A. Robinson, The Case for Byzantine Priority',
    about: 'His essay on why he holds the Byzantine form of the text to be the original line (TC: A Journal of Biblical Textual Criticism, 2001).',
    url: 'http://rosetta.reltech.org/TC/vol06/Robinson2001.html',
  },
  {
    name: 'Robinson and Pierpont, The New Testament in the Original Greek: Byzantine Textform (2005)',
    about: 'The editors’ page for the edition Lampas reads, on byzantinetext.com, with its public domain release.',
    url: 'https://byzantinetext.com/study/editions/robinson-pierpont/',
  },
  {
    name: 'The 2005 edition, a free scan on the Internet Archive',
    about: 'The printed edition with its introduction and appendix, to read or download.',
    url: 'https://archive.org/details/RP2005KoineGreekNTinByzantineTextform',
  },
  {
    name: 'The 2018 edition and both texts, on GitHub',
    about: 'Robinson’s files as the byztxt project keeps them (public domain): the 2018 text, and the release closest to the 2005 text that we compared the Greek with.',
    url: 'https://github.com/byztxt/byzantine-majority-text',
  },
  {
    name: 'The Majority Standard Bible (majoritybible.com)',
    about: 'The English translation Lampas reads, and its downloads. The site has no separate preface.',
    url: 'https://majoritybible.com/',
  },
];
