// src/data/passage.ts — the passage under a section heading (mw-5r3p30.73): from a verse that has a heading (`h`) to the verse before the next
// heading, or the chapter's end. A tap on a heading opens the Verse view (src/VerseView.tsx) for it, and the view treats it as a verse that
// spans several: `passageVerse` is a Verse whose `n` is the first verse and `to` the last, with every verse's words in order, so the ask, the
// reading check and the reading aloud work on it as they do on one verse. This is the same span as 'Passage' in the Read aloud span
// (src/speech/readSpan.ts). Pure: no store, no fetch.
import type { Verse } from './chapter';

export interface Passage {
  /** the MSB's heading, in English */
  heading: string;
  first: number;
  last: number;
  verses: Verse[];
}

/** The chapter's passages, in order: one for each verse that has a heading. A chapter whose first verse has no heading has verses before its
 * first passage that belong to none. */
export function passagesOf(verses: Verse[]): Passage[] {
  const passages: Passage[] = [];
  for (const verse of verses) {
    if (verse.h) passages.push({ heading: verse.h, first: verse.n, last: verse.n, verses: [verse] });
    else {
      const open = passages[passages.length - 1];
      if (open) {
        open.verses.push(verse);
        open.last = verse.n;
      }
    }
  }
  return passages;
}

/** The passage that starts at verse `first`, or undefined when no heading starts there. */
export const passageAt = (verses: Verse[], first: number): Passage | undefined => passagesOf(verses).find((p) => p.first === first);

/** The passage as one Verse: `n` the first verse, `to` the last, `h` the heading, and the Greek words and English chunks of every verse in order. */
export function passageVerse(passage: Passage): Verse {
  return {
    n: passage.first,
    to: passage.last,
    h: passage.heading,
    g: passage.verses.flatMap((v) => v.g),
    e: passage.verses.flatMap((v) => v.e),
  };
}

/** The key of a verse or a passage in a state keyed by it: '11', '1-11'. */
export const unitId = (unit: Pick<Verse, 'n' | 'to'>): string => (unit.to === undefined || unit.to === unit.n ? String(unit.n) : `${unit.n}-${unit.to}`);

/** 'verse 11' or 'verses 1-11': how the view's words name what it shows. */
export const unitName = (unit: Pick<Verse, 'n' | 'to'>): string => (unit.to === undefined || unit.to === unit.n ? `verse ${unit.n}` : `verses ${unit.n}-${unit.to}`);

/** 'Romans 8:11' or 'Romans 8:1-11'. */
export const unitReference = (title: string, unit: Pick<Verse, 'n' | 'to'>): string => `${title}:${unitId(unit)}`;
