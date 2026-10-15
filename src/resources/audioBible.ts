// src/resources/audioBible.ts — the audio Bibles a reader can turn on (Settings > Study resources > Audio Bible). The first is The Word of Promise
// (NKJV), which he owns in Audible. Audible publishes no way to open a book at a chapter or a time, so Lampas opens the book and says which Audible
// chapter to pick ('Chapters > Luke 15'). The list is a list so a second audio Bible (one Lampas plays itself) slots in later.
import { BOOKS } from '../data/books';
import { otBookOf } from '../data/otBooks';

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

/** UNVERIFIED on a device: Android's MEDIA_PLAY_FROM_SEARCH intent aimed at the Audible app, which opens the player if Audible accepts a search intent
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

/** The Audible chapter to pick: the NKJV book name and the chapter ('Luke 15', 'Song of Solomon 2'); undefined for a book in neither list.
 *  UNVERIFIED: whether Audible's chapter list for this book names chapters this way (the story asks the Governor). */
export function audibleChapterLabel(code: string, chapter: number): string | undefined {
  const name = BOOKS.find((b) => b.code === code)?.name ?? otBookOf(code)?.name;
  return name === undefined ? undefined : `${name} ${chapter}`;
}
