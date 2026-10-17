// src/handwriting/writeText.ts — what Write it says and how its buttons look (mw-86e9r1.51), shared by the card, the lesson's screen and the letter drill.
import { GLYPHS, STROKE_NOTES } from './templates';

/** What the first Write it says: a memory aid, never a goal. */
export const WHY_LINES = ['Writing a letter by hand helps it stick.', 'You never need to write Greek to read the Bible.'];

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';
export const WRITE_PRIMARY = `${BUTTON} border-accent bg-accent text-accent-fg disabled:border-line disabled:bg-surface disabled:text-muted`;
export const WRITE_PLAIN = `${BUTTON} border-line text-accent active:bg-line disabled:text-muted`;

const COUNTS = ['No strokes', 'One stroke', 'Two strokes', 'Three strokes', 'Four strokes', 'Five strokes'];

/** 'Two strokes: the top bar first, then the stem.' for the model of a letter; 'One stroke.' when there is one. */
export function strokeLineOf(letter: string): string {
  const count = (GLYPHS[letter]?.[0] ?? []).length;
  const head = COUNTS[count] ?? `${count} strokes`;
  const notes = STROKE_NOTES[letter];
  if (count < 2 || !notes) return `${head}.`;
  return `${head}: ${notes.map((note, i) => (i === 0 ? `${note} first` : `then ${note}`)).join(', ')}.`;
}
