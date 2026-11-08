// src/reader/split/splitPairing.ts — pairs the verses of the passage with the verses of the dock's text (docs/design/reader-split.md 'A text pane', mw-5r3p30.1130). Pure.
// The unit is Lampas's verse number, which both panes carry. The passage's verses are Lampas's; a Septuagint verse is Lampas's verse by its `ref` (Greek Ps 22:1 is Psalm 23:1) and may answer several (`refs`);
// every other text's verses are numbered as Lampas numbers them. The dock's sequence is the passage's: a passage verse with no partner gets a `missing` row at its place, so nothing is ever blank, and a dock
// verse with no Lampas number (an Addition, a Psalm's extra title) is drawn with its own number alone, where the dock's order puts it.
import type { Chapter, Verse } from '../../data/chapter';
import { lampasNumber } from '../septuagint';

/** A row of the dock: a verse of its text, or the place of a passage verse the text lacks. */
export type DockRow =
  | {
      kind: 'verse';
      verse: Verse;
      /** the first Lampas verse of the chapter this verse answers; null for a verse Lampas has no number for */
      lampas: number | null;
    }
  | { kind: 'missing'; lampas: number };

/** The Lampas verses of the open chapter a dock verse answers, ascending: its `ref` and `refs` that stand in `chapter` of `book`; for a verse without a `ref` (every text but the Septuagint) its own number. */
export function lampasOfDockVerse(verse: Pick<Verse, 'n' | 'ref' | 'refs'>, book: string, chapter: number): number[] {
  if (verse.ref === undefined) return [verse.n];
  if (verse.ref === 'none') return [];
  const all = [verse.ref, ...(verse.refs ?? [])];
  return [...new Set(all.filter((r) => r.book === book && r.chapter === chapter).map((r) => r.verse))].sort((a, b) => a - b);
}

/**
 * The dock's rows for a passage whose verses are `passage` (Lampas's numbers, ascending) and a dock text whose verses are `dock` (in the text's own order), in Lampas's chapter `chapter` of `book`.
 * Every dock verse is a row, in the dock's order; each passage verse no dock verse answers is a `missing` row put before the first dock verse that answers a later Lampas verse (at the end when none does),
 * so a text that runs in the passage's order has its rows in the passage's order, and a verse the text lacks stands where it would be.
 */
export function pairVerses(passage: readonly number[], dock: readonly Verse[], book: string, chapter: number): DockRow[] {
  const rows: DockRow[] = dock.map((verse) => ({ kind: 'verse', verse, lampas: lampasOfDockVerse(verse, book, chapter)[0] ?? null }));
  const answered = new Set(dock.flatMap((verse) => lampasOfDockVerse(verse, book, chapter)));
  const lacking = [...new Set(passage)].filter((n) => !answered.has(n)).sort((a, b) => a - b);
  for (const lampas of lacking) {
    // before the first dock verse that answers a later verse; a smaller missing verse placed there already stays before this one
    const before = rows.findIndex((row) => row.kind === 'verse' && row.lampas !== null && row.lampas > lampas);
    rows.splice(before < 0 ? rows.length : before, 0, { kind: 'missing', lampas });
  }
  return rows;
}

/** The Lampas verse number each verse of a chapter is known by, in the chapter's order: the passage's list for `pairVerses`. A Septuagint passage's verses with no Lampas verse have none and are left out. */
export const passageNumbers = (chapter: Pick<Chapter, 'edition' | 'verses'>): number[] => chapter.verses.flatMap((verse) => (verse.ref === 'none' ? [] : [lampasNumber(chapter, verse)]));
