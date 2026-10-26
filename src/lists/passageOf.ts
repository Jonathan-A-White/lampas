// src/lists/passageOf.ts — a listed reference as the passage player reads it (mw-9q8wp1.5): what PlayAllBar.tsx hands to src/speech/passagePlayer.ts. Pure.
import { headingOf, type ListedReference } from '../nav/refsInText';
import type { HeldPlace } from '../markdown/verseLinks';

/** What the passage player reads for a reference: as the reference card heads and holds it (a chapter alone is its first verse); every book of the Bible is held (the Old Testament in English). */
export function passageOf(r: ListedReference): { heading: string; held: HeldPlace } {
  const first = r.verse ?? 1;
  return {
    heading: r.verse === undefined ? `${headingOf(r)}:1` : headingOf(r),
    held: { book: r.book, chapter: r.chapter, first, last: r.verse === undefined ? first : (r.lastVerse ?? first) },
  };
}
