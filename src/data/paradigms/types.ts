// src/data/paradigms/types.ts — the shape of a paradigm table (mw-5r3p30.82, docs/paradigms.md). A table is rows of cells under
// columns; a cell is one form (Greek, or English for εἰμί) and names the grammar ideas of src/data/grammar/ladder.ts that a reader
// needs before the form is his to learn. Pure data: no store and no screen.
import type { Tier } from '../grammar/ladder';

export interface ParadigmCell {
  /** The text shown: Greek in NFC with its accents, or English (lang 'en'), or pointed Hebrew (lang 'he', mw-gdcyf98.13). A noun or verb ending starts with a hyphen: '-ος'. */
  form: string;
  lang: 'el' | 'en' | 'he';
  /** Ids of the ideas in LADDER the form needs; the form is available once every one is at the frontier or solid. */
  ideas: string[];
  /** Only in a Hebrew table (hebrew/ideas.ts): what the cell is in the fine grain the ladder's ideas lack ('tense:perfect', 'person:3', 'gender:m', 'number:s'), how a Hebrew parsing finds its own cell. */
  tags?: string[];
  /** Only in a table made by ownTable (ownForms.ts, mw-irpgqi.4): the text has no form of the word for this cell. `form` is then ''. */
  absent?: true;
  /** Only in a table made by ownTable: the form is the word's own, the one the text has, with its parsing and first use, and the pattern's form it stands in for. */
  own?: { code: string; count: number; book: string; chapter: number; verse: number; pattern: string; others: string[] };
}

export interface ParadigmColumn {
  label: string;
  /** What the heading says where the full label does not fit the phone ('Masc.'); the screen reader and the tutor get the label. */
  short?: string;
  /** A heading above several columns: 'Singular'. */
  group?: string;
}

export interface ParadigmRow {
  label: string;
  /** A heading above several rows: 'Present'. */
  group?: string;
  /** One cell for each column, in order. */
  cells: ParadigmCell[];
}

export interface Paradigm {
  /** The table's key in the address ('#/paradigms?t=article'); once shipped, not renamed. */
  id: string;
  /** PROVISIONAL, the Governor to confirm: 'The article', 'Noun endings', 'εἰμί', 'Verb endings'. */
  name: string;
  /** One line under the name on the list. */
  about: string;
  /** The ladder ideas the table teaches (ids of LADDER, at least one): the link the idea sheet uses to name the table. */
  ideas: string[];
  /** The ladder tier the table belongs to: the Paradigms list groups by it. */
  tier: Tier;
  columns: ParadigmColumn[];
  rows: ParadigmRow[];
}
