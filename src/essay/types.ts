// src/essay/types.ts — the shape of an essay kept in the app (mw-5r3p30.138): blocks of runs, and footnotes by number.

/** A stretch of text. `n` makes it the mark of footnote n (drawn as a raised number); `sup` raises other text (a siglum's number). */
export interface Run {
  t: string;
  i?: true;
  b?: true;
  u?: true;
  sup?: true;
  n?: number;
}

export type Block =
  /** a section heading; `n` is a footnote its title carries */
  | { k: 'h'; text: string; n?: number }
  /** a paragraph: `n` is its number in the essay, `q` a quotation, `depth` how deep in the essay's lists it sits */
  | { k: 'p'; runs: Run[]; n?: string; q?: true; depth?: number };

export interface Essay {
  title: string;
  author: string;
  blocks: Block[];
  /** the footnotes by number, as text (a key is the number written out) */
  notes: Record<string, Run[]>;
}
