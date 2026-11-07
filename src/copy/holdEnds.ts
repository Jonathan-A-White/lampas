// src/copy/holdEnds.ts — the ends the row of a hold on a verse number offers (mw-5r3p30.1074): Verse, Paragraph, Pericope, Chapter. Pure.
export type EndUnit = 'verse' | 'paragraph' | 'pericope' | 'chapter';

export interface HoldEnd {
  unit: EndUnit;
  /** what the row's button says */
  label: string;
  /** the last verse the copy then reaches */
  last: number;
}

export interface HoldEndsIn {
  /** the verse held */
  verse: number;
  /** the last verse of the held verse's paragraph; absent outside Paragraph layout */
  paragraphLast?: number | null;
  /** the last verse of the held verse's pericope (the passage under its heading); absent when it is under no heading */
  pericopeLast?: number | null;
  chapterLast: number;
}

const LABELS: Record<EndUnit, string> = { verse: 'Verse', paragraph: 'Paragraph', pericope: 'Pericope', chapter: 'Chapter' };

/** The ends to show, nearest first. Verse is always there; an end that reaches no further than one before it is left out, so every end shown differs. */
export function holdEnds({ verse, paragraphLast, pericopeLast, chapterLast }: HoldEndsIn): HoldEnd[] {
  const wanted: [EndUnit, number | null | undefined][] = [
    ['verse', verse],
    ['paragraph', paragraphLast],
    ['pericope', pericopeLast],
    ['chapter', chapterLast],
  ];
  const ends: HoldEnd[] = [];
  for (const [unit, last] of wanted) {
    if (last === null || last === undefined) continue;
    if (ends.some((e) => e.last === last)) continue;
    ends.push({ unit, label: LABELS[unit], last });
  }
  return ends;
}
