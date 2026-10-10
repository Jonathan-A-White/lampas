// src/reader/steps.ts — the Verse view's arrows (docs/module-map.md R1): each is a function that moves the view, or null when there is no place to go.
import type { Passage } from '../data/passage';
import { movePassage, moveVerse } from '../nav/route';

/** The arrow to the passage `by` places from `passage` in the chapter's passages: null at the chapter's first and last. */
export function stepOf(passages: Passage[], passage: Passage, by: 1 | -1): (() => void) | null {
  const to = passages[passages.findIndex((p) => p.first === passage.first) + by];
  return to ? () => movePassage(to.first) : null;
}

/** The arrow to a verse place (src/data/neighbours.ts), or null when there is none. */
export function stepOfVerse(place: { book: string; chapter: number; verse: number } | null): (() => void) | null {
  return place ? () => moveVerse(place) : null;
}
