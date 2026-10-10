// src/reader/steps.ts — the Verse view's arrows (docs/module-map.md R1): each is a function that moves the view, or null when there is no place to go.
import { loadChapter } from '../data/chapter';
import { neighbours } from '../data/neighbours';
import { passagesOf, type Passage } from '../data/passage';
import { movePassage, moveVerse, openReader, replaceHash, readerHash } from '../nav/route';

/** Moves the view to the first or last passage of another chapter (mw-5r3p30.129), on the entry it is on. The chapter's headings are not in the
 * bundle, so it is fetched; a chapter that cannot be fetched or has no heading is opened at its top instead, where the Reader says what is wrong. */
function movePassageAcross(book: string, chapter: number, which: 'first' | 'last'): void {
  loadChapter(book, chapter).then(
    (loaded) => {
      const passages = passagesOf(loaded.verses);
      const to = which === 'first' ? passages[0] : passages[passages.length - 1];
      if (to) replaceHash(readerHash({ book, chapter, passage: to.first }));
      else openReader({ book, chapter });
    },
    () => openReader({ book, chapter }),
  );
}

/** The arrow to the passage `by` places from `passage` in the chapter's passages; at the chapter's first or last it goes into the last passage of
 * the chapter before or the first of the chapter after, across books. Null only at Matthew 1's first and Revelation 22's last. */
export function stepOf(book: string, chapter: number, passages: Passage[], passage: Passage, by: 1 | -1): (() => void) | null {
  const to = passages[passages.findIndex((p) => p.first === passage.first) + by];
  if (to) return () => movePassage(to.first);
  const across = by === 1 ? neighbours(book, chapter).next : neighbours(book, chapter).previous;
  return across ? () => movePassageAcross(across.book, across.chapter, by === 1 ? 'first' : 'last') : null;
}

/** The arrow to a verse place (src/data/neighbours.ts), or null when there is none. */
export function stepOfVerse(place: { book: string; chapter: number; verse: number } | null): (() => void) | null {
  return place ? () => moveVerse(place) : null;
}
