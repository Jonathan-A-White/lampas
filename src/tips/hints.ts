// src/tips/hints.ts — the one-time tips that sit on a screen where they are needed (mw-5r3p30.80). The list of tips, "which one shows now"
// and "dismissed for good" are pwa-kit's (pwa-kit/tips); this file is Lampas's list and the storage it keeps the dismissals in (the
// phone's localStorage, key 'lampas.tipsDismissed'). A later tip is one more entry in HINTS. These are not the daily tips of
// src/tips/offer.ts (asked of the tutor): those come from a grind, these are written here.
import { tips } from 'pwa-kit/tips';

/** The events a tip is tied to (the `event` of an entry). */
export const WORD_SHEET_OPENED = 'word-sheet-opened';
/** The chapter buttons are drawn (src/ChapterNav.tsx): the tip about the swipe, then, once he has changed chapter by a swipe, the offer to hide them. */
export const CHAPTER_NAV_SHOWN = 'chapter-nav-shown';
export const CHAPTER_BUTTONS_OFFER = 'chapter-buttons-offer';
/** The offer's id: dismissing it is answering it (Hide or Keep), for good. */
export const HIDE_CHAPTER_BUTTONS = 'hide-chapter-buttons';

/** The first open of a main screen (mw-5r3p30.824): the screen draws a HintCard of its event, once. The Reader has none: its first visit already has the welcome, the Immersive card and the chapter-button tips. */
export const GOAL_OPENED = 'goal-opened';
export const WORDS_OPENED = 'words-opened';
export const REVIEW_OPENED = 'review-opened';
export const MEMORIZE_OPENED = 'memorize-opened';
export const PARADIGMS_OPENED = 'paradigms-opened';

export const HINTS: readonly tips.Tip[] = [
  { id: 'long-press-word', text: 'Long-press a word to hear it', event: WORD_SHEET_OPENED },
  { id: 'swipe-chapters', text: 'Swipe the text left or right to change chapter', event: CHAPTER_NAV_SHOWN },
  { id: HIDE_CHAPTER_BUTTONS, text: 'You swipe between chapters. Hide these buttons?', event: CHAPTER_BUTTONS_OFFER },
  { id: 'goal-screen', text: 'Pick a goal, then Learn next opens the lesson that gets you there', event: GOAL_OPENED },
  { id: 'words-screen', text: 'Your words live here; Test quizzes you on them', event: WORDS_OPENED },
  { id: 'review-screen', text: 'Review asks what is due; say how well you knew each word', event: REVIEW_OPENED },
  { id: 'memorize-screen', text: 'Verses you Memorize come here; Start all asks those due', event: MEMORIZE_OPENED },
  { id: 'paradigms-screen', text: 'Tap a form in a table to open the Reader where it is used', event: PARADIGMS_OPENED },
];

/** The hints Help lists under 'Tips' (src/help.ts): all but the offer, which is a question and not a tip. */
export const LISTED_HINTS: readonly tips.Tip[] = HINTS.filter((h) => h.id !== HIDE_CHAPTER_BUTTONS);

/** localStorage, or nothing when the phone refuses it: then the tip shows again, which is harmless. */
const storage: tips.TipStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // not kept
    }
  },
};

export const hints = tips.createTips({ tips: HINTS, storage, key: 'lampas.tipsDismissed' });

const SWIPED_KEY = 'lampas.chapterSwiped';

/** Remembers on the phone that he changed chapter by a swipe (scroll mode's chapter swipe, or a Turn pages swipe or drag past a chapter's edge; never a button,
 * a tap on a third or the page buttons): the chapter buttons then offer once to hide themselves (mw-5r3p30.706). */
export function noteChapterSwipe(): void {
  storage.setItem(SWIPED_KEY, '1');
}

/** True once he has changed chapter by a swipe on this phone. */
export const chapterSwiped = (): boolean => storage.getItem(SWIPED_KEY) === '1';
