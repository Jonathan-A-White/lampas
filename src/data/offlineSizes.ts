// src/data/offlineSizes.ts — how many bytes each scope of the offline copy fetches, for the megabytes the Keep on this phone chips show (mw-lcv9z3g.6).
// The New Testament's and the Old Testament's Hebrew are committed data, so their sizes are measured and held here; `npm run offline:sizes` and tests/unit/offline-sizes.test.ts measure them again
// from the files and fail when a label is more than 10% off, so a change to the data that moves them cannot go unseen. The Septuagint is written at deploy and grows as books are added, so its size is
// not a number held here: it is worked out from the index the phone reads (lxxBytes), per verse, and `npm run offline:sizes -- dist` checks that estimate against a real `npm run lxx:ship` output.
import type { LxxShipped } from './lxxChapter';
import type { OfflineScope } from './offlineCopy';

/** The New Testament scope: 260 chapters and the sermon index's New Testament files (measured 2026-11-09: 35,721,074 bytes). */
export const NT_BYTES = 35_721_074;
/** The Old Testament in Hebrew scope: 929 chapters, the two Hebrew word lists and the sermon index's Old Testament files (measured 2026-11-09: 76,894,630 bytes). */
export const HBO_BYTES = 76_894_630;

/**
 * The Septuagint's bytes per verse, measured over `npm run lxx:ship` of 2026-11-09 (198 chapters of Genesis, Exodus, Leviticus, Numbers, Psalms and Isaiah, 9,707,375 bytes for 3,643 verses): the prose books
 * come to 2,970 to 3,310 a verse, the Psalms (short lines) to 2,164.
 */
export const LXX_VERSE_BYTES = 3_100;
export const LXX_PSALM_VERSE_BYTES = 2_200;
/** lexicon-grc-lxx.json of the same ship: 812,403 bytes for those six books (it grows slower than the text, since a lemma is held once). */
export const LXX_LEXICON_BYTES = 810_000;

/** The Septuagint scope's bytes from the index the phone reads: every shipped verse at its book's rate, and the lexicon. */
export function lxxBytes(lxx: LxxShipped): number {
  // a chapter not shipped has 0 verses, so the sum is of the shipped ones
  const text = lxx.books.reduce((sum, b) => sum + b.verses.reduce((n, v) => n + v, 0) * (b.code === 'psa' ? LXX_PSALM_VERSE_BYTES : LXX_VERSE_BYTES), 0);
  // an index that ships no chapter has an empty lexicon
  return text === 0 ? 0 : text + LXX_LEXICON_BYTES;
}

/** The bytes a scope fetches, or undefined when it keeps the Septuagint and its index is not known. */
export function scopeBytes(scope: OfflineScope, lxx: LxxShipped | null): number | undefined {
  if (scope === 'none') return 0;
  if (scope === 'nt') return NT_BYTES;
  if (scope === 'hbo') return HBO_BYTES;
  if (!lxx) return undefined;
  return scope === 'lxx' ? lxxBytes(lxx) : NT_BYTES + HBO_BYTES + lxxBytes(lxx);
}
