// src/data/paradigms/cells.ts — a table drilled in Review (mw-svw421.6, docs/paradigms.md 'Drill this table'): a cell asked by its name among four forms of the same table.
// Pure and seeded like the other question builders: the random comes in, the same seed gives the same cells and the same options.
import type { GrammarQuestion } from '../grammar/questions';
import { shuffle, type Random } from '../random';
import { cellsOf, isAvailable, type Levels, type Paradigm, type ParadigmRow } from './index';

/** The most cells of a table that one round asks (PROVISIONAL). */
export const CELLS_A_ROUND = 3;

/** The review kind of a drilled table; its row id is the table's id. */
export const PARADIGM_KIND = 'paradigm';

const GREEK = /\p{Script=Greek}/u;

/** Lower case that leaves Greek words as they are: 'Genitive Singular Masculine' -> 'genitive singular masculine'. */
function plain(text: string): string {
  return text
    .split(' ')
    .map((word) => (GREEK.test(word) ? word : word.toLowerCase()))
    .join(' ')
    .replace(/(^|[\s“])i(?=[\s”,.?!]|$)/g, '$1I'); // the English 'I' of a gloss ('ἀγαπάω “I love”') stays a capital
}

/**
 * What is asked of a cell: the table, a colon, then the cell's place in plain words ('The article: genitive singular masculine'; 'Noun endings: first
 * declension, feminine in η (φωνή), dative singular'). The table's name is a label, so it leads: glued after the place with 'of' it read 'dative singular
 * of noun endings' (mw-indx1x6.7). A row's heading is set off from the rest of the place by a comma.
 */
export function cellPrompt(table: Paradigm, row: ParadigmRow, column: number): string {
  const col = table.columns[column];
  const place = [row.group, [row.label, col.group, col.label].filter(Boolean).join(' ')].filter((part): part is string => Boolean(part)).map(plain).join(', ');
  return `${table.name}: ${place}`;
}

/** What the voice is handed for a form once it is answered (before, hearing it would give the answer away): the hyphens of an ending ('-ος', 'ἔλυσ-α') are not said; a form that is not Greek is not said. */
export const spokenForm = (form: string): string | undefined => (GREEK.test(form) ? form.replace(/-/g, '') : undefined);

/**
 * Up to `count` available cells of the table, each a question: the cell's name as the prompt and four forms of the table as options, the right one and three others
 * whose text differs. The wrong options are other available forms first; a table with fewer than four available forms borrows locked ones, which are never asked
 * themselves. A table with no available cell draws nothing.
 */
export function drawCellQuestions(table: Paradigm, levels: Levels, random: Random, count = CELLS_A_ROUND): GrammarQuestion[] {
  const places = table.rows.flatMap((row) => row.cells.map((cell, c) => ({ cell, prompt: cellPrompt(table, row, c) })));
  const open = places.filter(({ cell }) => isAvailable(cell, levels));
  const chosen = shuffle(open, random).slice(0, count);
  return chosen.map(({ cell, prompt }): GrammarQuestion => {
    const taken = new Set([cell.form]);
    const others = [...shuffle(open.map((p) => p.cell.form), random), ...shuffle(cellsOf(table).filter((c) => !isAvailable(c, levels)).map((c) => c.form), random)];
    const wrong: string[] = [];
    for (const form of others) {
      if (wrong.length === 3) break;
      if (taken.has(form)) continue;
      taken.add(form);
      wrong.push(form);
    }
    return {
      kind: 'cell',
      ideaId: table.ideas[0],
      prompt,
      options: shuffle([cell.form, ...wrong], random),
      right: cell.form,
      table: table.id,
    };
  });
}
