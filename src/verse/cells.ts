// src/verse/cells.ts — the cells of the Verse view's row of actions (src/VerseView.tsx, mw-5r3p30.896): a six-column grid, three cells to a row (each `col-span-2`), two to a row under 15 rem
// of room (`col-span-3`, a phone at 200 % text, where a third of the row is too narrow for 'Read it aloud'), the last row's cells stretched over the row so no row has a hole (`col-span-3` for
// two, `col-span-6` for one), and every cell one column of one row from 30 rem (a phone sideways), where five labels have a line each. The spans are spelt out so Tailwind sees them.
const SPAN_WIDE: Record<number, string> = { 2: 'col-span-2', 3: 'col-span-3', 6: 'col-span-6' };
const SPAN_NARROW: Record<number, string> = { 3: '@max-[15rem]:col-span-3', 6: '@max-[15rem]:col-span-6' };

/** The classes of cell `index` of `cells`. */
export function cellSpan(index: number, cells: number): string {
  const lastRowWide = cells - (cells % 3 || 3);
  const lastRowNarrow = cells - (cells % 2 || 2);
  const wide = SPAN_WIDE[index >= lastRowWide ? 6 / (cells - lastRowWide) : 2];
  const narrow = SPAN_NARROW[index >= lastRowNarrow ? 6 / (cells - lastRowNarrow) : 3];
  return `${wide} ${narrow} @[30rem]:col-span-1`;
}
