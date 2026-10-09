// src/speech/readSpan.ts — how far the app reads aloud (mw-5r3p30.72), the Read aloud span setting as a list: the header's
// Read from the top / Read from here goes this far before the voice stops. docs/read-aloud.md says what each does. The play
// button on a verse always reads that verse only.
export type ReadSpan = 'verse' | 'passage' | 'chapter' | 'book';

export interface ReadSpanChoice {
  id: ReadSpan;
  label: string;
  /** one line: where the reading stops */
  stops: string;
}

export const READ_SPANS: readonly ReadSpanChoice[] = [
  { id: 'verse', label: 'Verse', stops: 'after the verse it started from' },
  { id: 'passage', label: 'Passage', stops: "before the next section heading (the Bible's own heading above a block of verses)" },
  { id: 'chapter', label: 'Chapter', stops: "at the chapter's end" },
  { id: 'book', label: 'Book', stops: "at the book's end, going on into each next chapter and turning the Reader to it" },
];

/** PROVISIONAL, the Governor to confirm: the chapter. */
export const DEFAULT_READ_SPAN: ReadSpan = 'chapter';

export const isReadSpan = (value: unknown): value is ReadSpan => READ_SPANS.some((s) => s.id === value);
