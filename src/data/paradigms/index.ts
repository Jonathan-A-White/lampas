// src/data/paradigms/index.ts — the paradigm tables, in the order the Paradigms list shows them (docs/paradigms.md), and what his
// grammar levels make of them. Pure: the levels come in as a lookup (listLevels' rows, or a fixture).
import type { Level } from '../grammar/needs';
import { ARTICLE } from './article';
import { EIMI } from './eimi';
import { NOUN_ENDINGS } from './nounEndings';
import type { Paradigm, ParadigmCell, ParadigmColumn, ParadigmRow } from './types';
import { VERB_ENDINGS } from './verbEndings';

export type { Paradigm, ParadigmCell, ParadigmColumn, ParadigmRow };

/** One line per table: a new table is one file here plus one line in this list. */
export const PARADIGMS: readonly Paradigm[] = [ARTICLE, NOUN_ENDINGS, EIMI, VERB_ENDINGS];

export const paradigmById = (id: string | undefined): Paradigm | undefined => PARADIGMS.find((p) => p.id === id);

/** Where each idea stands: a lookup by idea id; an idea it does not know is not yet. */
export type Levels = ReadonlyMap<string, { level: Level }>;

const AVAILABLE: readonly Level[] = ['frontier', 'solid'];

/** A form is his to learn once every idea it names is at the frontier or solid. */
export function isAvailable(cell: ParadigmCell, levels: Levels): boolean {
  return cell.ideas.every((id) => AVAILABLE.includes(levels.get(id)?.level ?? 'notYet'));
}

export const cellsOf = (table: Paradigm): ParadigmCell[] => table.rows.flatMap((row) => row.cells);

export function availableCount(table: Paradigm, levels: Levels): { available: number; total: number } {
  const cells = cellsOf(table);
  return { available: cells.filter((cell) => isAvailable(cell, levels)).length, total: cells.length };
}

/** 'Available forms: 12 of 36' */
export const availableText = ({ available, total }: { available: number; total: number }): string => `Available forms: ${available} of ${total}`;

/** The cell's place in plain words, for the screen reader and the tutor: 'Genitive Singular Masculine', 'Present 2nd person singular Greek'. */
export function cellName(table: Paradigm, row: ParadigmRow, column: number): string {
  const col = table.columns[column];
  return [row.group, row.label, col.group, col.label].filter(Boolean).join(' ');
}

/** The ideas of a locked cell that are not yet at the frontier, as the ladder's titles would say them (ids; the screen looks the titles up). */
export const missingIdeas = (cell: ParadigmCell, levels: Levels): string[] =>
  cell.ideas.filter((id) => !AVAILABLE.includes(levels.get(id)?.level ?? 'notYet'));
