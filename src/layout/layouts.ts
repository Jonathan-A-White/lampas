// src/layout/layouts.ts — how the reader sets the verses of a chapter on the page, as a list so another layout is one more
// entry here plus whatever it needs to draw; the reader, Settings and the settings store name no layout themselves.
// A layout only says where a new block starts; the reader draws each block (src/Reader.tsx). Section headings are a
// separate choice: a verse with a heading always starts a block, so a heading is drawn above its block in every layout.
import type { Verse } from '../data/chapter';

/** The ids of the entries below. */
export type ReadingLayout = 'verse' | 'paragraph';

export interface LayoutEntry {
  id: ReadingLayout;
  /** what Settings shows */
  label: string;
  /** true when `verse` (the `index`th of the chapter) starts a block of its own */
  startsBlock: (verse: Verse, index: number) => boolean;
}

export const LAYOUTS: readonly LayoutEntry[] = [
  { id: 'verse', label: 'Verse by verse', startsBlock: () => true },
  // The MSB's paragraph starts are verses[].p (docs/data.md); the chapter's first verse starts one whether or not it has p.
  { id: 'paragraph', label: 'Paragraph', startsBlock: (verse, index) => index === 0 || verse.p === 1 },
];

export const DEFAULT_LAYOUT: ReadingLayout = 'verse';

export function isLayout(value: unknown): value is ReadingLayout {
  return LAYOUTS.some((l) => l.id === value);
}

/** The entry for `id`; the default's when it is not one (a saved value from a later version). */
export function layoutOf(id: unknown): LayoutEntry {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS.find((l) => l.id === DEFAULT_LAYOUT)!;
}

/** The verses in the order they are read, cut into the blocks the layout draws. */
export function blocksOf(verses: readonly Verse[], layout: ReadingLayout): Verse[][] {
  const { startsBlock } = layoutOf(layout);
  const blocks: Verse[][] = [];
  verses.forEach((verse, index) => {
    if (index === 0 || verse.h !== undefined || startsBlock(verse, index)) blocks.push([verse]);
    else blocks[blocks.length - 1].push(verse);
  });
  return blocks;
}
