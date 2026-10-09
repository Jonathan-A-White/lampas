// src/tips/hints.ts — the one-time tips that sit on a screen where they are needed (mw-5r3p30.80). The list of tips, "which one shows now"
// and "dismissed for good" are bsv-kit's (bsv-kit/tips); this file is Lampas's list and the storage it keeps the dismissals in (the
// phone's localStorage, key 'lampas.tipsDismissed'). A later tip is one more entry in HINTS. These are not the daily tips of
// src/tips/offer.ts (asked of the tutor): those come from a grind, these are written here.
import { tips } from 'bsv-kit/tips';

/** The events a tip is tied to (the `event` of an entry). */
export const WORD_SHEET_OPENED = 'word-sheet-opened';

export const HINTS: readonly tips.Tip[] = [
  { id: 'long-press-word', text: 'Long-press a word to hear it', event: WORD_SHEET_OPENED },
];

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
