// src/preface.ts — what the Preface page says (mw-5r3p30.125): a few plain paragraphs about the text Lampas reads, and the sources it
// links to. It holds only what we chose (the Greek and Hebrew texts, the English, the sources); what the app does is Help's (src/help.ts, mw-5r3p30.823).
// Every address here was fetched and answered 200 before it went in (the story's closing comment lists each one).

/**
 * Which edition the Greek follows, and how we know (docs/greek-edition.md, made by `npm run greek:edition`, mw-5r3p30.136): the
 * table's Greek was compared word by word with both editions, and a test holds this line to that file's verdict.
 */
export const PREFACE_EDITION_LINE =
  'The Majority Standard Bible’s table does not say which edition its Greek is, so we compared it word by word with both. It is the 2005 edition: where the 2018 edition, which Robinson recommends in its place, changes a word (a few accents and capitals), the Greek in Lampas has the 2005 reading. Both editions are public domain.';

/** Where the variant readings come from (docs/greek-edition.md, mw-9ji6ek0.4): the apparatus laid on the Greek, and the 2026 text's changes to the 2018 wording. */
export const PREFACE_VARIANTS_LINE =
  'The variant readings Lampas can show beside the Greek are those of the Robinson-Pierpont 2018 edition with its apparatus, and the 2026 changes, where the Robinson-Pierpont 2026 text words a place differently, are applied; the list of them is linked below. Five short lessons on variant readings, written for Lampas from public-domain sources, are in the app and read offline; the first time you turn variants on, a card offers them. Each variant’s sheet has a Go deeper section: the lessons, the apparatus file of its book, the 2005 edition’s scan and, from your Logos library, the Greek texts at the verse. The tutor explains a variant when you ask and does not rule on which reading is right.';

/** What an Old Testament chapter offers (mw-gdcyf98.22): the Hebrew view and its switch, and the drills; the Diagram is still Greek and English only. A test holds this line to the Reader's behaviour. */
export const PREFACE_OLD_TESTAMENT_LINE =
  'An Old Testament chapter opens in the Reader in English or, from Curious on the Hebrew dial, in its Hebrew, with a switch between the two; Quiz me, Review and the Quick test ask its Hebrew words and ideas as they ask the Greek. The sentence Diagram is still Greek and English only.';

/** The paragraphs, in the app's voice: what the text is and who stands behind it, not an argument. */
export const PREFACE_PARAGRAPHS: string[] = [
  'The Greek you read in Lampas is the Byzantine Textform, edited by Maurice A. Robinson and William G. Pierpont and published in 2005 as The New Testament in the Original Greek. It is the form of the text found in the large majority of surviving Greek manuscripts, so it is often called the Majority text.',
  PREFACE_EDITION_LINE,
  PREFACE_VARIANTS_LINE,
  'Robinson makes the case that this form of the text goes back to the earliest centuries and should be read as the original line of transmission, not as a late revision. Other scholars, who give most weight to the oldest manuscripts, read the evidence differently, and most modern Bibles follow them. Lampas does not settle that question. It tells you which text it uses and points you to the people who wrote about it. Robinson’s essay, The Case for Byzantine Priority, is here to read in the app, as it is printed in the appendix of the 2005 edition, and the older article it grew from is linked beneath it.',
  'The English beside the Greek is the Majority Standard Bible, whose New Testament is translated from the same Robinson and Pierpont text. Its footnotes note where the modern critical texts read differently. The Robinson and Pierpont text and the Majority Standard Bible are both public domain.',
  'The Old Testament is read in the English of the Majority Standard Bible, which there is the Berean Standard Bible, and in the pointed Hebrew and Aramaic of the Westminster Leningrad Codex, word-aligned to it. Both are public domain. The gloss and definition of a Hebrew word are from the STEPBible lexicon.',
  PREFACE_OLD_TESTAMENT_LINE,
];

export interface PrefaceLink {
  /** the name the link carries */
  name: string;
  /** one line under it: what you will find there */
  about: string;
  url: string;
  /** a copy of it inside the app (src/Essay.tsx): the entry opens that, and `url` is kept beneath as the original */
  copy?: 'essay';
}

/** Robinson's essay inside the app (mw-5r3p30.138; the 2005 appendix's text since mw-5r3p30.162). */
export const ESSAY_TITLE = 'The Case for Byzantine Priority';
/** The article the journal published in 2001: an earlier form of the essay, which the 2005 release does not cover; linked beneath the copy. */
export const ESSAY_ORIGINAL = { name: 'Original (TC Journal, 2001)', url: 'http://rosetta.reltech.org/TC/vol06/Robinson2001.html' };
/** The appendix of the 2005 edition as the editors' site gives it: the text the app carries. */
export const ESSAY_SOURCE = {
  name: 'Appendix of the 2005 edition (PDF, byzantinetext.com)',
  url: 'https://byzantinetext.com/wp-content/uploads/2016/11/editions-rp-11-appendix.pdf',
};
/** Under the original link, and on the Preface under the entry: what the old page is like (it answers on plain http only, so Chrome calls it Not secure). */
export const ESSAY_ORIGINAL_NOTE = 'An old-format page, small on a phone. It answers only on http, so Chrome shows “Not secure” for it.';
/** The line under the essay's title. */
export const ESSAY_CREDIT = 'Maurice A. Robinson. The appendix of the Robinson-Pierpont 2005 edition (pp. 533 to 586); the essay was first published in TC: A Journal of Biblical Textual Criticism (2001).';
/** What the copy is and why Lampas may carry it: the 2005 edition's own release of its appendix (https://byzantinetext.com/study/editions/robinson-pierpont/). */
export const ESSAY_RELEASE =
  'This is the appendix of the Robinson-Pierpont 2005 edition, set for a phone. The editors wrote in the edition’s copyright notice: “Likewise, we hereby release into the public domain the introduction and appendix which have been especially prepared for this edition.” This text is that appendix, taken from the editors’ own PDF of it. It is not the article the journal published in 2001: Robinson revised the essay for the book, and the wording differs in many places, so the 2001 article, which that release does not cover, is only linked below as the older version. Here the Greek, which the PDF types in Latin letters, is set in Greek letters (without accents, as the PDF’s text has none), the signs for the papyri and the great uncials are letters, a footnote opens under the paragraph that cites it, and the chart is left in the edition.';

/** The sources, the Robinson essay first. Its original is only on an older site that answers on plain http; the app carries a copy. */
export const PREFACE_LINKS: PrefaceLink[] = [
  {
    name: 'Maurice A. Robinson, The Case for Byzantine Priority',
    about: 'His essay on why he holds the Byzantine form of the text to be the original line, as printed in the appendix of the 2005 edition, to read here in the app.',
    url: ESSAY_ORIGINAL.url,
    copy: 'essay',
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
    about: 'Robinson’s files as the byztxt project keeps them (public domain): the 2018 text and its apparatus of variant readings, which Lampas’s chapter files carry, and the release closest to the 2005 text that we compared the Greek with.',
    url: 'https://github.com/byztxt/byzantine-majority-text',
  },
  {
    name: 'The 2026 changes to the Greek, listed',
    about: 'Each place where the Robinson-Pierpont 2026 text changes the 2018 wording, and how the app lays it on the Greek.',
    url: 'https://github.com/Jonathan-A-White/lampas/blob/main/docs/greek-edition.md',
  },
  {
    name: 'The Majority Standard Bible (majoritybible.com)',
    about: 'The English translation Lampas reads, and its downloads; its footnotes give the critical text’s English for many variant readings. The site has no separate preface.',
    url: 'https://majoritybible.com/',
  },
];
