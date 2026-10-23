// src/lists/passageOf.ts — a listed reference as the passage player reads it (mw-9q8wp1.5): what PlayAllBar.tsx hands to src/speech/passagePlayer.ts. Pure.
import { headingOf, type ListedReference } from '../nav/refsInText';
import type { PassageRef } from '../speech/passagePlayer';

/** What the passage player reads for a reference: as the reference card heads and holds it (a chapter alone is its first verse); the Old Testament has no place held. */
export function passageOf(r: ListedReference): PassageRef {
  if (r.testament === 'ot') return { heading: headingOf(r), held: null };
  const first = r.verse ?? 1;
  return {
    heading: r.verse === undefined ? `${headingOf(r)}:1` : headingOf(r),
    held: { book: r.book, chapter: r.chapter, first, last: r.verse === undefined ? first : (r.lastVerse ?? first) },
  };
}
