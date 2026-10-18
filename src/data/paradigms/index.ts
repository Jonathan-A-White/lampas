// src/data/paradigms/index.ts — the paradigm tables, in the order the Paradigms list shows them (docs/paradigms.md), and what his
// grammar levels make of them. Pure: the levels come in as a lookup (listLevels' rows, or a fixture).
import { ideasOf } from '../grammar/ladder';
import { patternsOf } from '../grammar/patterns';
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
 * not know has none. A code names no declension and no contract or -μι verb, so a word given as `word` (its lemma, and its form for an adjective) also wants the
 * declension its lemma has (patterns.ts patternsOf), against the cell's ideas and the table's: a form of πατήρ is in The third declension, not Noun endings
 * (mw-svw421.37). Without the word only the code is weighed.
 */
export function tableFor(code: string, word?: { l: string; t?: string }): Paradigm | undefined {
  // kept per code and lemma (mw-5r3p30.422): a drill asks it of every word of the passage on each of its tries
  const key = word ? `${code}|${word.l}|${word.t ?? ''}` : code;
  if (tableCache.has(key)) return tableCache.get(key);
  const table = findTable(code, word);
  tableCache.set(key, table);
  return table;
}

/** The ideas a code names, kept per code, however many lemmas carry it (drill-work.test.ts); undefined for a code the ladder does not know. */
function ideasOfCode(code: string): string[] | undefined {
  if (!wantedCache.has(code)) {
    try {
      wantedCache.set(code, ideasOf(code));
    } catch {
      wantedCache.set(code, undefined);
    }
  }
  return wantedCache.get(code);
}

const wantedCache = new Map<string, string[] | undefined>();
// only the declensions weigh: the other patterns (contract, -μι, the augment) belong to a verb whose other tenses, moods and voices are in the tables of those
const DECLENSIONS = ['declension-1', 'declension-2', 'declension-3'];
const tableCache = new Map<string, Paradigm | undefined>();

function findTable(code: string, word?: { l: string; t?: string }): Paradigm | undefined {
  const wanted = ideasOfCode(code);
  if (!wanted) return undefined;
  const patterns: string[] = word ? patternsOf({ l: word.l, p: code, t: word.t }).filter((id) => DECLENSIONS.includes(id)) : [];
  // the patterns a table's cells carry (a third-declension cell names declension-3); a table that names a pattern in its own `ideas` holds it whole
  const sharedWith = (ideas: readonly string[]): number => ideas.filter((id) => wanted.includes(id) || patterns.includes(id)).length;
  let best: Paradigm | undefined;
  let bestShared = 0;
  for (const table of PARADIGMS) {
    const own = table.ideas.filter((id) => patterns.includes(id));
    const shared = Math.max(0, ...cellsOf(table).map((cell) => sharedWith([...new Set([...cell.ideas, ...own])])));
    if (shared > bestShared) [best, bestShared] = [table, shared];
  }
  return best;
}
