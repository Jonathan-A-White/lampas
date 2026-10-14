// src/data/grammar/teach/table.ts — whether a Greek form is in a card's table (mw-5r3p30.234): a cell is a whole form or an ending, matched with the
// marks taken off, so τοῖς is the article's 'τοῖς' and ἀρχῆς ends in the genitive's '-ης'. The examples of a card are held to it.
import type { TeachTable } from './types';

/** The letters alone, lower case, the final sigma as σ: 'Τοῖς' is 'τοισ'. Breathings, accents, the iota under a letter and the apostrophe go. */
export const bare = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\p{M}'’᾿ʼ]/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ');

/** The forms and endings one cell holds: 'τοῦ', '-ου', '-ουσι(ν)' (both '-ουσι' and '-ουσιν'), 'μου or ἐμοῦ'. */
export function cellOptions(cell: string): { ending: boolean; text: string }[] {
  return cell
    .split(/\s+or\s+|,\s*/)
    .map((option) => option.trim())
    .filter((option) => option && option !== '–')
    .flatMap((option) => {
      const ending = option.startsWith('-');
      const text = option.replace(/^-/, '');
      const movable = /\((\p{L}+)\)$/u.exec(text);
      const forms = movable ? [text.slice(0, movable.index), text.slice(0, movable.index) + movable[1]] : [text];
      return forms.map((form) => ({ ending, text: bare(form) }));
    });
}

/** True when `form` is one of the table's forms, or ends in one of its endings. */
export function tableHas(table: TeachTable, form: string): boolean {
  const word = bare(form);
  return table.rows.some((row) => row.cells.some((cell) => cellOptions(cell).some((o) => (o.ending ? word.endsWith(o.text) && word.length > o.text.length : word === o.text))));
}
