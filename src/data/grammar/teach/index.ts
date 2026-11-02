// src/data/grammar/teach/index.ts — every card's teaching, by ladder idea id (mw-5r3p30.234, docs/card-audit.md): what it is, how to spot it (a table
// where the idea is a set of endings or forms) and a worked New Testament word, written so a total beginner who has proved every card below learns
// the idea from the card alone, with no term a card below has not taught (tests/unit/teach-cards.test.ts). One file per tier; pure data.
import { LADDER } from '../ladder';
import { partsLine, partsOf } from '../../wordParts';
import { JOINERS } from './joiners';
import type { Pronunciation } from '../../../speech/pronunciation';
import { LETTERS, readSpelled } from './letters';
import { MARKS } from './marks';
import { NOUNS } from './nouns';
import { PREPOSITIONS_TEACH } from './prepositions';
import { PRONOUNS } from './pronouns';
import { SENTENCES } from './sentences';
import { SOUNDS } from './sounds';
import type { Teach, TeachTable, WorkedExample } from './types';
import { VERBS } from './verbs';

export type { CardDiagram, Teach, TeachTable, WorkedExample } from './types';
export { bare, cellOptions, tableHas } from './table';

/** Every Greek card by idea id (ladders.ts reads it through ladderFor('grc').teach). */
export const GREEK_TEACH: Readonly<Record<string, Teach>> = { ...LETTERS, ...SOUNDS, ...MARKS, ...NOUNS, ...PRONOUNS, ...PREPOSITIONS_TEACH, ...VERBS, ...JOINERS, ...SENTENCES };

for (const id of Object.keys(GREEK_TEACH)) if (!LADDER.some((i) => i.id === id)) throw new Error(`Teaching for ${JSON.stringify(id)}, which the ladder has not`);

/** The card's teaching of the idea with this id. Throws on one the cards do not have. */
export function teachOf(id: string): Teach {
  const teach = GREEK_TEACH[id];
  if (!teach) throw new Error(`No teaching for the grammar idea ${JSON.stringify(id)}`);
  return teach;
}

/** The Greek words a table shows (mw-5r3p30.986): a column head, a row label or a cell, split where a cell lists several ('οὐ or οὐκ', 'χείρ, -ος'), each as the text has it:
 * no ending ('-ος'), no gloss after it ('ἐκ “out of”'), no movable letter in brackets, and none written in capitals with no marks (ΛΟ-ΓΟΣ). In order, each once. */
export function tableWords(table: TeachTable): string[] {
  const texts = [...table.columns, ...table.rows.flatMap((r) => [r.label, ...r.cells])];
  const words = texts.flatMap((text) => text.split(/ or |, /)).map((piece) => piece.normalize('NFC').replace(/ “[^”]*”$/, '').replace(/\([^)]*\)$/, ''));
  return [...new Set(words.filter((w) => /^[\p{Script=Greek}᾿']+$/u.test(w) && w !== w.toUpperCase()))];
}

/** Every Greek word a card's worked examples and word table show (mw-5r3p30.986), as the text has it: the worked word is `say` when it is written in capitals. */
export function cardWords(teach: Teach): string[] {
  return [...new Set([...teach.worked.map((w) => (w.say ?? w.word).normalize('NFC')), ...(teach.table ? tableWords(teach.table) : [])])];
}

/** The parts of every word a card shows that has them, one line each ('οὐδεμία: οὐδέ “and not” + μία “one”'), as the sheet draws them. */
export function cardPartsLines(teach: Teach): string[] {
  return cardWords(teach).flatMap((word) => {
    const entry = partsOf(word);
    return entry ? [`${word}: ${partsLine(entry)}`] : [];
  });
}

/** Every line of text a card shows: what it is, how to spot it, the table's words, the diagram's verse and words, each worked example's meaning and steps, and the parts of its words. */
export function cardTexts(teach: Teach): string[] {
  const table = teach.table ? [teach.table.caption, ...teach.table.columns, ...teach.table.rows.flatMap((r) => [r.label, ...r.cells]), teach.table.note ?? ''] : [];
  const diagram = teach.diagram ? [teach.diagram.reference, ...teach.diagram.words.map((w) => w.text)] : [];
  return [teach.whatItIs, teach.howToSpot, ...table, ...diagram, ...teach.worked.flatMap((w) => [w.gloss, ...stepsOf(w, null)]), ...cardPartsLines(teach)].filter((t) => t !== '');
}

/** The worked example to show: the first whose word is in the passage he reads (`words`, its forms), else the card's first. */
export function workedFor(teach: Teach, words: ReadonlySet<string>): { worked: WorkedExample; inPassage: boolean } {
  const has = (w: WorkedExample): boolean => words.has((w.say ?? w.word).normalize('NFC'));
  const found = teach.worked.find(has);
  return found ? { worked: found, inPassage: true } : { worked: teach.worked[0], inPassage: false };
}

/** The worked example's steps as they are read in `scheme` (none: the neutral text): a word read letter by letter gives each letter its sound as well as its name. */
export const stepsOf = (worked: WorkedExample, scheme: Pronunciation | null): string[] => worked.steps.map((step) => readSpelled(step, scheme));
