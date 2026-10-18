// src/data/paradigms/layout.ts — how many columns of a paradigm table fit a width, and which columns go together (mw-svw421.40, which folds
// mw-svw421.15, .26 and .27). Pure arithmetic on the table's own forms and headings, in rem, so it follows the Text size (rem is the root
// font size, which --lp-scale sets): a table that does not fit in one block is drawn as several, each holding the columns that fit, one under
// the other, with the row labels repeated. Nothing is made smaller and nothing scrolls sideways. ParadigmsScreen measures the box and draws.
import type { Paradigm, ParadigmColumn } from './types';

/** The row-label column: 5.5rem (w-[5.5rem], not tailwind w-22: spacing stays in pixels as the Text size grows, rem does not). */
export const LABEL_REM = 5.5;
/** What a cell adds around its text: the td padding, the box padding and the border, in rem (12 px at the phone's own size). */
const CELL_EXTRA_REM = 0.75;
/** The Greek forms' width, as a share of their size per letter. A serif Greek (Gentium Plus, Noto Serif) averages about 0.55; this leaves room. */
const GREEK_EM_PER_LETTER = 0.62;
/** The headings' width, as a share of their size per letter (a sans semibold, wider than the Greek). */
const HEADING_EM_PER_LETTER = 0.62;
/** The size of a column heading (tailwind text-xs) and of a column group heading (text-sm), in rem. */
const HEADING_REM = 0.75;
const GROUP_REM = 0.875;
/** The least a column is given, so a cell stays a target for a thumb. */
const LEAST_REM = 2.75;

/** The size of a table's Greek in rem: the larger one where there are one or two columns to share the width, as before. */
export const greekRemOf = (table: Paradigm): number => (table.columns.length <= 2 ? 1.5 : 1.25);

const longestWord = (text: string): number => Math.max(0, ...text.split(/\s+/).map((word) => word.length));

/** The width of column `c` in rem: its widest Greek form, or its heading if that is wider. */
export function columnNeedRem(table: Paradigm, c: number, span = 1): number {
  const letters = Math.max(0, ...table.rows.map((row) => (row.cells[c]?.lang === 'el' ? row.cells[c].form.length : 0)));
  const column = table.columns[c];
  const heading = (longestWord(column.short ?? column.label) * HEADING_EM_PER_LETTER * HEADING_REM);
  const group = (longestWord(column.group ?? '') * HEADING_EM_PER_LETTER * GROUP_REM) / span;
  return Math.max(LEAST_REM, letters * GREEK_EM_PER_LETTER * greekRemOf(table) + CELL_EXTRA_REM, heading + CELL_EXTRA_REM, group + CELL_EXTRA_REM);
}

/** The columns of one heading in `columns`, as runs: [[0, 1, 2], [3, 4, 5]] for Singular and Plural; every column in one run when none has a group. */
function runsOf(columns: ParadigmColumn[]): number[][] {
  const runs: number[][] = [];
  columns.forEach((column, i) => {
    const last = runs[runs.length - 1];
    if (last && columns[last[0]].group === column.group) last.push(i);
    else runs.push([i]);
  });
  return runs;
}

/** How many columns fit a box `widthRem` wide (at least one, at most all). */
export function columnsThatFit(table: Paradigm, widthRem: number): number {
  const runs = runsOf(table.columns);
  const need = Math.max(...table.columns.map((_, c) => columnNeedRem(table, c, runs.find((run) => run.includes(c))?.length ?? 1)));
  return Math.min(table.columns.length, Math.max(1, Math.floor((widthRem - LABEL_REM) / need)));
}

/** The column indexes of each block when `perBlock` columns fit: whole headings kept together (Singular, Plural) where they fit, else split. */
export function blocksOf(columns: ParadigmColumn[], perBlock: number): number[][] {
  const blocks: number[][] = [];
  let open: number[] = [];
  const flush = () => {
    if (open.length > 0) blocks.push(open);
    open = [];
  };
  for (const run of runsOf(columns)) {
    if (open.length + run.length > perBlock) flush();
    for (let i = 0; i < run.length; i += perBlock) {
      const piece = run.slice(i, i + perBlock);
      if (open.length + piece.length > perBlock) flush();
      open.push(...piece);
    }
  }
  flush();
  return blocks;
}
