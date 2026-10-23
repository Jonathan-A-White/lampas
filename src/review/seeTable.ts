// src/review/seeTable.ts — where an answered ending card's See the table goes (mw-svw421.5, mw-irpgqi.6): the table that holds the ending, in Learn so the forms are
// shown, on the asked word's own forms (This word) with the cell the question asked lit. A table the word's forms do not reach shows the pattern, the cell still lit.
import { bestHit, cellsLanding, paradigmById } from '../data/paradigms';
import type { GrammarQuestion } from '../data/grammar/questions';
import type { ParadigmAddress } from '../nav/route';

/** The Paradigms address of an ending question's table, or undefined for a question that has none. A question that does not name its word (one kept from before) opens the bare table. */
export function seeTableAddress(question: GrammarQuestion): ParadigmAddress | undefined {
  const { table: id, word, lemma, code } = question;
  if (question.kind !== 'ending' || !id) return undefined;
  const table = paradigmById(id);
  if (!table || !word || !lemma || !code) return { table: id };
  const cell = bestHit(cellsLanding(table, { t: word, l: lemma, p: code }))?.place;
  return { table: id, mode: 'learn', ...(cell ? { cell } : {}), word, parse: code, lemma, own: true };
}
