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
  'Robinson makes the case that this form of the text goes back to the earliest centuries and should be read as the original line of transmission, not as a late revision. Other scholars, who give most weight to the oldest manuscripts, read the evidence differently, and most modern Bibles follow them. Lampas does not settle that question. It tells you which text it uses and points you to the people who wrote about it. Robinson’s essay, The Case for Byzantine Priority, is here to read in the app, as it is printed in the appendix of the 2005 edition, and the older article it grew from is linked beneath it.',
  'The English beside the Greek is the Majority Standard Bible, whose New Testament is translated from the same Robinson and Pierpont text. Its footnotes note where the modern critical texts read differently. The Robinson and Pierpont text and the Majority Standard Bible are both public domain.',
];

/** What Lampas costs: nothing to read; a licence is for the AI only (mw-8m9dyu.3). Under its own heading on the Preface. */
export const PREFACE_FREE =
  'Lampas is free to read: the Greek, the English, the lessons and the quizzes need no licence. A licence unlocks the AI, which is the tutor and everything sent to it. Until a phone has one, Settings shows those options off, with “Needs a licence”, and the Licence page has Get a licence: it is free, asks for an email and a phone (Twilio sends a code to each to prove them; Lampas keeps them only as scrambled fingerprints), and licenses this phone once both codes are typed. A licence covers up to three devices: once licensed, the Licence page shows My devices, each by name and when it was last used, with Rename and Remove (Remove takes that device’s licence back and frees its place), and a new phone joins by Get a licence with the same phone number. Once, on a third visit, a quiet line at the foot of the Reader says what a licence adds; it is never pressed on you. Lampas opens as a plain English Bible: at the top of Settings, How much Greek? is a dial from Just English to All in, and each step shows more of the Greek and nothing more (Curious: the Greek view and a word’s Strong’s number; Dipping a toe: the Weave; Learning: new words each day; Reading in Greek: the Reader opens in Greek; All in: everything). There is also an optional course in the standard symbols for the sounds of Greek (the IPA), under Optional on the Goal screen: nothing else in Lampas needs it. Under Hard sounds (optional) on the same screen are short lessons on the Greek sounds an English ear finds hard (the tapped r, γ, χ, δ and θ, π, τ and κ without a puff of air, pure vowels, κ, γ, χ and λ before e and i, μπ, ντ and γκ, and two consonants at the start of a word), each with its tip for an American or a British ear; each has a drill, Which did you hear?, in which the Greek voice says one word of a close pair and you tap which, with the pair played side by side after a miss. The first time a new phone’s licence is found, Lampas opens in plain English and the tutor welcomes you with three short questions, which you can skip. When a drill ends (Drill it, or a short drill of your drill plan), the round Ask the tutor button sits beside Done and the tutor is told every question, the answer you gave, the right answer and which were right or wrong, so the results are something to talk through. On the Paradigms list and on each table there is an Ask the tutor button; on a table the tutor is told which table, whether you are in Learn or Drill, the cell you are on (with its form when the table shows it) and the word you came from, and each table keeps a talk of its own. Under Talk in Settings you choose whether the talk bars are held while you speak or tapped to start and stop, and whether Ask the tutor and the Talk sheet send your words when you let go or keep them in the box until you tap Send. Anything being read aloud pauses while you hold to talk, and if the phone stops listening before you let go, what you had said so far is kept, never lost.';

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
    about: 'Robinson’s files as the byztxt project keeps them (public domain): the 2018 text, and the release closest to the 2005 text that we compared the Greek with.',
    url: 'https://github.com/byztxt/byzantine-majority-text',
  },
  {
    name: 'The Majority Standard Bible (majoritybible.com)',
    about: 'The English translation Lampas reads, and its downloads. The site has no separate preface.',
    url: 'https://majoritybible.com/',
  },
];
