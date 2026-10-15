// src/data/paradigms/index.ts — the paradigm tables, in the order the Paradigms list shows them (docs/paradigms.md), and what his
// grammar levels make of them. Pure: the levels come in as a lookup (listLevels' rows, or a fixture).
import { ideasOf } from '../grammar/ladder';
import type { Level } from '../grammar/needs';
import { ADJECTIVE_ENDINGS } from './adjectiveEndings';
import { AORIST_AND_FUTURE_PASSIVE } from './aoristAndFuturePassive';
import { ARTICLE } from './article';
import { CONTRACT_VERBS } from './contractVerbs';
import { EIMI } from './eimi';
import { FUTURE_AND_AORIST } from './futureAndAorist';
import { IMPERATIVE } from './imperative';
import { INFINITIVE } from './infinitive';
import { MI_VERBS } from './miVerbs';
import { NOUN_ENDINGS } from './nounEndings';
import { OIDA } from './oida';
import { PARTICIPLE } from './participle';
import { PERFECT_AND_PLUPERFECT } from './perfectAndPluperfect';
import { PRONOUNS_DEMONSTRATIVE_RELATIVE } from './pronounsDemonstrativeRelative';
import { PRONOUNS_INTERROGATIVE_INDEFINITE } from './pronounsInterrogativeIndefinite';
import { PRONOUNS_PERSONAL } from './pronounsPersonal';
import { SECOND_AORIST } from './secondAorist';
import { SUBJUNCTIVE } from './subjunctive';
import { THIRD_DECLENSION } from './thirdDeclension';
import type { Paradigm, ParadigmCell, ParadigmColumn, ParadigmRow } from './types';
import { VERB_ENDINGS } from './verbEndings';

export type { Paradigm, ParadigmCell, ParadigmColumn, ParadigmRow };

/** One line per table: a new table is one file here plus one line in this list. */
export const PARADIGMS: readonly Paradigm[] = [
  ARTICLE,
  NOUN_ENDINGS,
  EIMI,
  VERB_ENDINGS,
  THIRD_DECLENSION,
  ADJECTIVE_ENDINGS,
  PRONOUNS_PERSONAL,
  PRONOUNS_DEMONSTRATIVE_RELATIVE,
  PRONOUNS_INTERROGATIVE_INDEFINITE,
  FUTURE_AND_AORIST,
  AORIST_AND_FUTURE_PASSIVE,
  PERFECT_AND_PLUPERFECT,
  SECOND_AORIST,
  CONTRACT_VERBS,
  MI_VERBS,
  OIDA,
  SUBJUNCTIVE,
  IMPERATIVE,
  INFINITIVE,
  PARTICIPLE,
];

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

/** The tables that teach an idea (their `ideas` name it), in the list's order: what the idea sheet links to. None for an idea no table teaches. */
export const paradigmsOf = (ideaId: string): Paradigm[] => PARADIGMS.filter((p) => p.ideas.includes(ideaId));

/**
 * The one table that holds the ending of a form with this RP code (mw-svw421.5): the table with a cell whose ideas share the most with the ideas the code names
 * (ladder.ts ideasOf); the earlier table in the list when two share as many; undefined when none shares any (a preposition, a conjunction). A code the ladder does
 * not know has none.
 */
export function tableFor(code: string): Paradigm | undefined {
  // kept per code (mw-5r3p30.422): a drill asks it of every word of the passage on each of its tries, and the answer depends on the code alone
  if (tableCache.has(code)) return tableCache.get(code);
  const table = findTable(code);
  tableCache.set(code, table);
  return table;
}

const tableCache = new Map<string, Paradigm | undefined>();

function findTable(code: string): Paradigm | undefined {
  let wanted: string[];
  try {
    wanted = ideasOf(code);
  } catch {
    return undefined;
  }
  let best: Paradigm | undefined;
  let bestShared = 0;
  for (const table of PARADIGMS) {
    const shared = Math.max(0, ...cellsOf(table).map((cell) => cell.ideas.filter((id) => wanted.includes(id)).length));
    if (shared > bestShared) [best, bestShared] = [table, shared];
  }
  return best;
}
