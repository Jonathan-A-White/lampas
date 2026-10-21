// src/speech/readSpan.ts — how far the header's Play reads aloud (mw-5r3p30.72, remade by mw-5r3p30.705): the 'Play to' setting. The header's Play always
// goes on from where he is, to the end of the book or the end of the Bible. A shorter reading comes from what he tapped, not from a setting: a verse's play
// and Listen read the verse, a section heading's view its section, the place line's chapter view its chapter. docs/read-aloud.md says what each does.

/** The two choices of the Play to setting. */
export type PlayTo = 'book' | 'bible';

export interface PlayToChoice {
  id: PlayTo;
  label: string;
  /** one line: where the reading stops */
  stops: string;
}

export const PLAY_TOS: readonly PlayToChoice[] = [
  { id: 'book', label: 'End of the book', stops: "at the book's end, going on into each next chapter and turning the Reader to it" },
  { id: 'bible', label: 'End of the Bible', stops: 'at the end of Revelation, going on into each next chapter and each next book and turning the Reader to it' },
];

/** How far one reading goes: the two Play to choices, and the spans of the shorter readings a tap starts (a verse, a section, a chapter). */
export type ReadSpan = 'verse' | 'passage' | 'chapter' | PlayTo;

export const DEFAULT_PLAY_TO: PlayTo = 'book';

export const isPlayTo = (value: unknown): value is PlayTo => PLAY_TOS.some((s) => s.id === value);

/** A saved value as the setting: an old span (verse, passage, chapter) or anything else that is not one of the two reads as the end of the book. */
export const playToOf = (value: unknown): PlayTo => (isPlayTo(value) ? value : DEFAULT_PLAY_TO);
