// src/data/grammar/teach/types.ts — the shape of a card's teaching (mw-5r3p30.234): what a total beginner reads on an idea sheet to learn the idea from
// the card alone, having proved every card below it. Pure types; the cards themselves are one file per tier beside this one.

/** A small table of the forms or endings the idea is: the article's forms, a case's endings, a tense's endings. */
export interface TeachTable {
  /** 'The genitive endings' */
  caption: string;
  /** the heads of the columns: 'λόγος “word”', 'masculine' */
  columns: string[];
  /** each row, its label and one cell per column. A cell is a whole form ('τοῦ'), an ending ('-ου'; '-ουσι(ν)' with a movable letter), several
   * written with ' or ' between them, or '' for none. An example of the idea must be in the table: its form a cell's form, or ending in a cell's ending. */
  rows: { label: string; cells: string[] }[];
  /** a line under the table */
  note?: string;
}

/** One New Testament word taken apart, step by step. */
export interface WorkedExample {
  /** the word as it is shown: as the text has it, or (before the marks are taught) in capitals with no marks, as the oldest copies wrote it */
  word: string;
  /** the word as the text has it, for the voice and the respelling, when `word` is written otherwise */
  say?: string;
  /** where it stands: '1 John 1:1'; none for a common word met everywhere */
  ref?: string;
  /** what it means here, one sense */
  gloss: string;
  /** the word taken apart, one short line a step, in the card's own terms */
  steps: string[];
}

export interface Teach {
  /** plain English, with an English example; no Greek needed */
  whatItIs: string;
  /** how it shows in Greek: the form or the ending to look for */
  howToSpot: string;
  table?: TeachTable;
  /** the worked examples, the first the one shown when the verse he reads has none of the others */
  worked: WorkedExample[];
  /** the parts of speech (ladder ids: 'verb', 'pronoun') an example may be beside those the cards below taught, when the card itself teaches how to read
   * them: the persons read 'we' off a verb's ending before the verb has its own card */
  examplesAs?: string[];
}
