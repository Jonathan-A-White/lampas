// src/resources/audioBible.ts — the audio Bibles a reader can turn on (Settings > Study resources > Audio Bible). The first is The Word of Promise
// (NKJV), which he owns in Audible. 'Listen in Audible' is Audible's own smart link with position_from_start (audible-kit's audibleLink): it opens the
// Audible app and plays from the start of the chapter, from the chapter start times in audibleStarts.json (built once from Audible's public catalogue by
// `npm run audible:build`, keyed by Lampas's book code and chapter). A chapter with no start known falls back to opening the book and naming the Audible
// chapter to pick ('Chapters > Luke 15'). The list is a list so a second audio Bible (one Lampas plays itself) slots in later.
import { audibleLink } from 'audible-kit';
import { BOOKS } from '../data/books';
import { otBookOf } from '../data/otBooks';
import starts from './audibleStarts.json' with { type: 'json' };

export interface AudioBible {
  /** what the setting 'audioBible' holds while it is on */
  id: string;
  /** the choice's name in Settings */
  choice: string;
  /** the name the link and the credit use */
  name: string;
  /** the credit line under the link (VISION.md: credit every source) */
  credit: string;
  /** the link's href: opens the book in the app */
  intentUrl: string;
  /** the book's page, opened when the phone stays on Lampas (openApp.ts armFallback); the Audible app takes it as an app link when installed */
  pageUrl: string;
}

/** The Word of Promise Audio Bible, NKJV, Thomas Nelson (98 h) in Audible. */
const AUDIBLE_ASIN = 'B003UC45I8';
const WORD_OF_PROMISE_PAGE = `https://www.audible.com/pd/${AUDIBLE_ASIN}`;

/** The fallback for a chapter with no start known (the way it was before the smart link). UNVERIFIED on a device: Android's MEDIA_PLAY_FROM_SEARCH intent aimed at the Audible app, which opens the player if Audible accepts a search intent
 *  from the browser; Chrome opens `browser_fallback_url` itself when the app is not there, and the book's page is also opened by armFallback. If Audible
 *  turns out to ignore it, change this one string (docs/resources.md). */
const WORD_OF_PROMISE_INTENT =
  'intent:#Intent;action=android.media.action.MEDIA_PLAY_FROM_SEARCH;package=com.audible.application;' +
  `S.query=${encodeURIComponent('The Word of Promise Audio Bible')};S.browser_fallback_url=${encodeURIComponent(WORD_OF_PROMISE_PAGE)};end`;

/** PROVISIONAL wording of the choice. */
export const AUDIO_BIBLES: readonly AudioBible[] = [
  {
    id: 'word-of-promise',
    choice: 'The Word of Promise (NKJV), in Audible',
    name: 'The Word of Promise',
    credit: 'The Word of Promise, Thomas Nelson. Needs the book in your Audible library.',
    intentUrl: WORD_OF_PROMISE_INTENT,
    pageUrl: WORD_OF_PROMISE_PAGE,
  },
];

/** The audio Bible a saved value names, or undefined for 'off' and anything else. */
export const audioBibleOf = (id: string): AudioBible | undefined => AUDIO_BIBLES.find((b) => b.id === id);

/** Audible's own chapter titles where they are not the Bible's name for the book and the chapter: the catalogue says 'Psalm 23' and 'Revelations 22', and
 *  names the five one-chapter books by one title with no number (mw-5r3p30.412; scripts/audible-build.ts checks every label against the catalogue). */
const AUDIBLE_BOOK_NAMES: Readonly<Record<string, string>> = { psa: 'Psalm', rev: 'Revelations' };
const AUDIBLE_ONE_CHAPTER_TITLES: Readonly<Record<string, string>> = {
  oba: 'The Book of Obadiah',
  phm: 'The Epistle of Paul the Apostle to Philemon',
  '2jn': 'The Second Epistle of John',
  '3jn': 'The Third Epistle of John',
  jud: 'The Epistle of Jude',
};

/** The Audible chapter to pick: Audible's own title for the chapter ('Luke 15', 'Song of Solomon 2', 'Psalm 23', 'Revelations 22', 'The Book of Obadiah');
 *  undefined for a book in neither list. */
export function audibleChapterLabel(code: string, chapter: number): string | undefined {
  const name = BOOKS.find((b) => b.code === code)?.name ?? otBookOf(code)?.name;
  if (name === undefined) return undefined;
  return AUDIBLE_ONE_CHAPTER_TITLES[code] ?? `${AUDIBLE_BOOK_NAMES[code] ?? name} ${chapter}`;
}

const STARTS: Readonly<Record<string, number>> = starts.chapters;

/** Where a chapter starts in The Word of Promise, in milliseconds from the start of the audio, or undefined for a chapter with no start known. */
export function audibleStartOf(code: string, chapter: number): number | undefined {
  return STARTS[`${code}.${chapter}`];
}

export interface AudibleListen {
  /** the link's href */
  href: string;
  /** the page to open when the phone stays on Lampas (openApp.ts armFallback); absent for Audible's own link, which sends a phone without the app to its store */
  fallback?: string;
}

/** What 'Listen in Audible' opens for a chapter: Audible's smart link at the chapter's start, stamped with `now`, the time of the tap (Audible wants the
 *  link made when it is tapped); with no start known, the search intent for the book and the book's page as its fallback. */
export function audibleListen(bible: AudioBible, code: string, chapter: number, now: number = Date.now()): AudibleListen {
  const start = audibleStartOf(code, chapter);
  if (start === undefined) return { href: bible.intentUrl, fallback: bible.pageUrl };
  return { href: audibleLink({ asin: AUDIBLE_ASIN, positionMs: start, now }) };
}
