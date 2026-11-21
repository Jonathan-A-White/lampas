// src/lists/passageOf.ts — a listed reference as the passage player reads it (mw-9q8wp1.5): what PlayAllBar.tsx hands to src/speech/passagePlayer.ts. Pure.
import { headingOf, type ListedReference } from '../nav/refsInText';
import type { HeldPlace } from '../markdown/verseLinks';
import type { PassageRef } from '../speech/passagePlayer';

/** What the passage player reads for a reference: as the reference card heads and holds it (a chapter alone is its first verse); every book of the Bible is held (the Old Testament in English). */
export function passageOf(r: ListedReference): { heading: string; held: HeldPlace } {
  const first = r.verse ?? 1;
  return {
    heading: r.verse === undefined ? `${headingOf(r)}:1` : headingOf(r),
    held: { book: r.book, chapter: r.chapter, first, last: r.verse === undefined ? first : (r.lastVerse ?? first) },
  };
}

/** What the passage player is handed for a reference (mw-fnvjof.18): `passageOf` for a verse or a range of verses, and for a chapter alone or a range of whole chapters ('Judges 1–5') the
 *  chapters whole, from the first verse of the first to the last verse of `through`, headed as the page printed them ('Judges 1-5', 'Psalm 23'), not as the one verse a card shows. */
export function playableOf(r: ListedReference): PassageRef & { held: HeldPlace } {
  const passage = passageOf(r);
  if (r.verse !== undefined) return passage;
  return { heading: headingOf(r), held: passage.held, through: r.lastChapter ?? r.chapter };
}
