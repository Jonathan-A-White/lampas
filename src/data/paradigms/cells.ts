// src/data/paradigms/cells.ts — a table drilled in Review (mw-svw421.6, docs/paradigms.md 'Drill this table'): a cell asked by its name among four forms of the same table.
// Pure and seeded like the other question builders: the random comes in, the same seed gives the same cells and the same options.
import type { GrammarQuestion } from '../grammar/questions';
import { shuffle, type Random } from '../random';
import { cellName, cellsOf, isAvailable, type Levels, type Paradigm, type ParadigmRow } from './index';

/** The most cells of a table that one round asks (PROVISIONAL). */
export const CELLS_A_ROUND = 3;

/** The review kind of a drilled table; its row id is the table's id. */
export const PARADIGM_KIND = 'paradigm';

const GREEK = /\p{Script=Greek}/u;

/** Sentence case that leaves Greek words as they are: 'Genitive Singular Masculine' -> 'Genitive singular masculine'. */
function plain(text: string): string {
  return text
    .split(' ')
    .map((word) => (GREEK.test(word) ? word : word.toLowerCase()))
    .join(' ');
}

/** What is asked of a cell: its place in plain words, then the table: 'Genitive singular masculine of the article'. */
export function cellPrompt(table: Paradigm, row: ParadigmRow, column: number): string {
  const text = `${plain(cellName(table, row, column))} of ${plain(table.name)}`;
  return `${text[0].toUpperCase()}${text.slice(1)}`;
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
