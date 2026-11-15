// src/data/poetry.ts — a verse of poetry as its lines (docs/data.md 'Poetry lines'): the Berean table's line marks are `Verse.l`, where each line starts as an English chunk and how deep it stands.
import type { Verse } from './chapter';

export interface PoetryLineSpan {
  /** how deep the line stands: 1, or 2 for the deeper lines; 0 for the lead-in (below) */
  indent: 0 | 1 | 2;
  /** the line opens a block, where the stanza breaks */
  stanza: boolean;
  /** the first English chunk of the line */
  from: number;
  /** one past its last chunk */
  to: number;
  /** the line's English, as the chunks run together */
  text: string;
  /** the lead-in: the chunks ahead of a verse's first mark, prose that brings the lines in ('He said:', a Psalm's title), set flush left ahead of them */
  continued: boolean;
}

/**
 * The lines of a verse of poetry, in English order, or null when the verse is prose (it has no `l`). The chunks before the first mark (528 verses: 'Then Mary said:', a Psalm's title, 'He said:') are the verse's lead-in,
 * a line of their own, `continued`, flush left (indent 0).
 */
export function poetryLinesOf(verse: Pick<Verse, 'e' | 'l'>): PoetryLineSpan[] | null {
  const marks = verse.l;
  if (!marks?.length) return null;
  const lines: PoetryLineSpan[] = [];
  const text = (from: number, to: number): string => verse.e.slice(from, to).map((c) => c.t.trim()).filter(Boolean).join(' ');
  if (marks[0][0] > 0) lines.push({ indent: 0, stanza: false, from: 0, to: marks[0][0], text: text(0, marks[0][0]), continued: true });
  marks.forEach(([chunk, indent, stanza], i) => {
    const to = i + 1 < marks.length ? marks[i + 1][0] : verse.e.length;
    lines.push({ indent, stanza: stanza === 1, from: chunk, to, text: text(chunk, to), continued: false });
  });
  return lines;
}
