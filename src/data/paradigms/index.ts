// src/data/paradigms/index.ts — the paradigm tables, in the order the Paradigms list shows them (docs/paradigms.md), and what his
// grammar levels make of them, as far as How much of a table takes in (the extent, src/data/grammar/extent.ts, mw-irpgqi.2). Pure: the levels come in as a lookup (listLevels' rows, or a fixture).
import { DEFAULT_EXTENT, withinExtent, type GrammarExtent } from '../grammar/extent';
import { ideasOf, ideasOfWord } from '../grammar/ladder';
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

/** A form is his to learn once every idea it names is at the frontier or solid (the default extent); with `extent` given, whether every idea is within it (extent.ts). */
export function isAvailable(cell: ParadigmCell, levels: Levels, extent: GrammarExtent = DEFAULT_EXTENT): boolean {
  return cell.ideas.every((id) => withinExtent(levels.get(id)?.level, extent));
}

/**
 * Where a cell stands under How much of a table (mw-irpgqi.2): `open` (within the extent and his: shown, asked), `notYet` (within Any but not his: shown, marked
 * not yet with what it needs), `outside` (his, but Solid only hides it: an empty cell), `locked` (not his and not within: a lock, as ever).
 */
export type CellStanding = 'open' | 'notYet' | 'outside' | 'locked';

export function standingOf(cell: ParadigmCell, levels: Levels, extent: GrammarExtent): CellStanding {
  const his = isAvailable(cell, levels);
  const within = isAvailable(cell, levels, extent);
  if (within) return his ? 'open' : 'notYet';
  return his ? 'outside' : 'locked';
}

export const cellsOf = (table: Paradigm): ParadigmCell[] => table.rows.flatMap((row) => row.cells);

/** How many cells the table shows as his under `extent` (standing `open`): the list's bar, the table's line, and (at the default) whether Review has a cell to ask. */
export function availableCount(table: Paradigm, levels: Levels, extent: GrammarExtent = DEFAULT_EXTENT): { available: number; total: number } {
  const cells = cellsOf(table);
  return { available: cells.filter((cell) => standingOf(cell, levels, extent) === 'open').length, total: cells.length };
}

/** The count as the extent says it: 'Available forms: 12 of 36'; under Any 'All 36 forms shown, 12 available'; under Solid only 'Solid forms: 12 of 36'. */
export function availableText({ available, total }: { available: number; total: number }, extent: GrammarExtent = DEFAULT_EXTENT): string {
  if (extent === 'any') return `All ${total} forms shown, ${available} available`;
  return `${extent === 'solid' ? 'Solid' : 'Available'} forms: ${available} of ${total}`;
}

/** The cell's place in plain words, for the screen reader and the tutor: 'Genitive Singular Masculine', 'Present 2nd person singular Greek'. */
export function cellName(table: Paradigm, row: ParadigmRow, column: number): string {
  const col = table.columns[column];
  return [row.group, row.label, col.group, col.label].filter(Boolean).join(' ');
}

/** The ideas of a locked or not-yet cell that are not yet at the frontier, as the ladder's titles would say them (ids; the screen looks the titles up). */
export const missingIdeas = (cell: ParadigmCell, levels: Levels): string[] => cell.ideas.filter((id) => !withinExtent(levels.get(id)?.level, DEFAULT_EXTENT));

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

/** A word's table, and the place in it that is the word's own (mw-irpgqi.1): `cell` is the cell's name (cellName), undefined when the table holds no form of the word's parse. */
export interface WordParadigm {
  table: Paradigm;
  cell?: string;
}

// the accents and breathings go; the iota subscript (U+0345) stays, for it is part of the ending
const bare = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u0344\u0346-\u036f]/g, '').normalize('NFC').toLowerCase();
/** The spellings a cell's form stands for: 'ἐστί(ν)' is ἐστί and ἐστίν; a hyphen starts an ending. */
const spellingsOf = (form: string): string[] => [form.replace(/\([^)]*\)/g, ''), form.replace(/[()]/g, '')].map(bare);

// what a parsing says of a form: its case, number, gender, person, tense, voice and mood (tense-signs is a pattern, not a tense); a deponent verb's voice is the voice its forms have
const KIND = /^(case|number|gender|person|tense|voice|mood)-/;
const kindOf = (id: string): string | undefined => (id === 'tense-signs' ? undefined : KIND.exec(id)?.[1]);
const plain = (id: string): string => id.replace(/-deponent$/, '');
/** The parsing as the tables name it: a middle or a passive verb is a form of the table's middle or passive voice. */
const asTablesSay = (wanted: readonly string[]): string[] => {
  const ids = wanted.map(plain);
  return ids.some((id) => id === 'voice-middle' || id === 'voice-passive') ? [...ids, 'voice-middle-or-passive'] : ids;
};

// the ideas of a table that holds the forms of particular verbs: a cell with one is for a word of those verbs alone
const OF_ITS_OWN_VERBS = ['eimi', 'contract-verbs', 'mi-verbs', 'oida'];

/**
 * Whether a cell is where the parsing `wanted` (ideasOfWord) lands: it shares an idea of the word that is not one of those kinds (verb, noun, the article), it names nothing of case, number, gender, person, tense, voice or mood that the word has otherwise,
 * it names whatever of them the word has unless it is silent on that kind altogether (εἰμί's cells name no voice; a noun's no person), and a cell of particular verbs
 * is for the word of one of them.
 */
function lands(cell: ParadigmCell, wanted: readonly string[]): boolean {
  const mine = asTablesSay(wanted);
  const named = cell.ideas.filter((id) => kindOf(id) !== undefined);
  const wantedKinds = new Set(mine.map(kindOf));
  // it is a cell of the word's own kind of word (a verb's, a noun's, a personal pronoun's)
  if (!cell.ideas.some((id) => kindOf(id) === undefined && mine.includes(id))) return false;
  if (named.some((id) => wantedKinds.has(kindOf(id)) && !mine.includes(id))) return false;
  if (cell.ideas.some((id) => OF_ITS_OWN_VERBS.includes(id) && !mine.includes(id))) return false;
  const kinds = new Set(named.map(kindOf));
  // a voice the word has is any of the cell's when the cell's is the middle or passive (the word's own voice and the table's are the same kind)
  return mine.every((id) => kindOf(id) === undefined || !kinds.has(kindOf(id)) || named.includes(id) || (kindOf(id) === 'voice' && named.some((n) => kindOf(n) === 'voice' && mine.includes(n))));
}

/**
 * The one table a tap on this word opens and the cell in it that is the word's own (mw-irpgqi.1). A table that holds the word's own form (ἀγαπῶ is in Contract
 * verbs, ἐστίν in εἰμί) wins over tableFor's table, which holds only its ending (Verb endings); else tableFor's. A cell is the word's when it lands on the word's
 * parsing (`lands`), and of those the one that names the most of the word's ideas; when two name as many, the one whose ending the word ends with (ἀληθείᾳ: -ᾳ, not -ῃ),
 * then the earlier. A word no table fits (a conjunction, a particle) has none, and a form the table does not hold (a participle in the accusative) has the table and no cell.
 */
export function paradigmOfWord(word: { t: string; l: string; p: string }): WordParadigm | undefined {
  // kept per form, lemma and code: the word sheet asks it on every draw, a drag of its handle included
  const key = `${word.t}|${word.l}|${word.p}`;
  if (!wordCache.has(key)) wordCache.set(key, findWordParadigm(word));
  return wordCache.get(key);
}

const wordCache = new Map<string, WordParadigm | undefined>();

function findWordParadigm(word: { t: string; l: string; p: string }): WordParadigm | undefined {
  let wanted: string[];
  try {
    wanted = ideasOfWord(word);
  } catch {
    return undefined;
  }
  const form = bare(word.t);
  interface Hit {
    table: Paradigm;
    place: string;
    shared: number;
    suffix: number;
    whole: boolean;
  }
  const hitsIn = (table: Paradigm): Hit[] =>
    table.rows.flatMap((row) =>
      row.cells.flatMap((cell, c) => {
        if (cell.lang !== 'el' || !lands(cell, wanted)) return [];
        const spellings = spellingsOf(cell.form);
        // a form with a hyphen is a stem and an ending (λυσ-ομαι) or an ending alone (-ος): the longer the ending the word has, the better the cell
        const ending = spellings[0].slice(spellings[0].lastIndexOf('-') + 1);
        const suffix = cell.form.includes('-') && form.endsWith(ending) ? ending.length : 0;
        return [{ table, place: cellName(table, row, c), shared: cell.ideas.filter((id) => asTablesSay(wanted).includes(id)).length, suffix, whole: spellings.includes(form) }];
      }),
    );
  const better = (a: Hit, b: Hit): boolean => a.shared > b.shared || (a.shared === b.shared && a.suffix > b.suffix);
  const best = (hits: Hit[]): Hit | undefined => hits.reduce<Hit | undefined>((top, hit) => (top === undefined || better(hit, top) ? hit : top), undefined);
  const own = best(PARADIGMS.flatMap(hitsIn).filter((hit) => hit.whole));
  if (own) return { table: own.table, cell: own.place };
  const table = tableFor(word.p, word);
  if (!table) return undefined;
  const here = best(hitsIn(table));
  if (here) return { table, cell: here.place };
  // tableFor weighs the ideas a parsing names and not the voice (a middle verb's table is εἰμί's): another table that holds the word's parse is its table
  const elsewhere = best(PARADIGMS.filter((other) => other !== table).flatMap(hitsIn));
  if (elsewhere) return { table: elsewhere.table, cell: elsewhere.place };
  // εἰμί's table for a participle of another verb is no table of the word's: the table of the general kind with the most of its ideas
  const mine = asTablesSay(wanted);
  const bound = cellsOf(table).flatMap((cell) => cell.ideas.filter((id) => OF_ITS_OWN_VERBS.includes(id)));
  if (bound.length === 0 || bound.some((id) => mine.includes(id))) return { table };
  const near = (other: Paradigm): number =>
    Math.max(0, ...cellsOf(other).filter((cell) => !cell.ideas.some((id) => OF_ITS_OWN_VERBS.includes(id))).map((cell) => cell.ideas.filter((id) => mine.includes(id)).length));
  const closest = PARADIGMS.reduce<Paradigm | undefined>((top, other) => (near(other) > (top ? near(top) : 0) ? other : top), undefined);
  return { table: closest ?? table };
}
