// src/diagram/types.ts — the sentence diagram's tree (mw-souyao, the epic's design) and the words it indexes. The tutor works a verse out as this tree once,
// Lampas keeps it and draws it (layout.ts, ReedKellogg.tsx); the sentence-diagram grind's answer schema mirrors these types. THE RULE (validate.ts): every word
// sent appears exactly once across the tree. Punctuation is not a word.

/** A word of the diagram: {i} indexes the request's words, {implied} is an understood word the sentence does not spell out ('you' of an imperative). */
export type TokenRef = { i: number } | { implied: string };

/** One place on a base line (or a modifier's line): its words, side by side, and the modifiers that hang beneath it. */
export interface Slot {
  words: TokenRef[];
  modifiers: Modifier[];
}

/** An article, adjective or adverb on a slanted line under the word it modifies; its own modifiers hang under it. */
export interface WordModifier {
  kind: 'word';
  word: TokenRef;
  modifiers: Modifier[];
}

/** A slanted line with the preposition, then a level line with its object (and that object's modifiers). */
export interface PrepositionalModifier {
  kind: 'prepositional';
  preposition: TokenRef;
  object: Slot;
}

/** A subordinate clause on its own base line beneath, joined by a dotted line from its connector word ('where', 'since') to the word it hangs on. */
export interface ClauseModifier {
  kind: 'clause';
  connector?: TokenRef;
  clause: Clause;
}

export type Modifier = WordModifier | PrepositionalModifier | ClauseModifier;

export type ComplementKind = 'direct-object' | 'indirect-object' | 'predicate-nominative' | 'predicate-adjective';

/** What completes the verb: after a half bar (direct object), a bar slanted back (predicate nominative or adjective), or hung under the verb with no bar (indirect object). */
export interface Complement {
  kind: ComplementKind;
  slot: Slot;
}

export interface Clause {
  subject: Slot;
  verb: Slot;
  complement?: Complement;
}

/** A clause of the verse; the second and later are coordinate with the one before, stacked under it and joined by a dotted step line carrying `joinedBy` (the conjunction). */
export interface ClauseEntry {
  clause: Clause;
  joinedBy?: TokenRef;
}

/** The whole answer for a verse. */
export interface Diagram {
  clauses: ClauseEntry[];
}

/** The words a diagram draws: the translation's English, the Greek New Testament's own words, or an Old Testament verse's Hebrew (mw-5r3p30.887: its pieces, the article, a prefixed preposition and vav apart from their word). */
export type DiagramMode = 'english' | 'greek' | 'hebrew';

/** One word the tree indexes: English words are split from the chapter's chunks (`chunk` is the English chunk it came from, whose Greek words a tap opens), Greek words are the verse's own (`word` is the Greek word index); a Hebrew piece is part of a verse word (`word` is that word's index, so the pieces of one word share it); in a passage each also names its `verse`. */
export type DiagramWord = ({ text: string; chunk: number } | { text: string; word: number }) & {
  /** the verse's number, only on the words of a passage of several verses: `chunk` and `word` count within that verse */
  verse?: number;
  /** only on an English word the Weave shows in Greek (src/diagram/weave.ts): the verse's Greek word indexes drawn in its place (none: the chunk's other words, which the Greek has taken the place of) */
  weft?: number[];
  /** only on a Hebrew word (mode 'hebrew'): its English gloss, drawn under it ('' where it has none) */
  gloss?: string;
};

/** The words of a request, in order: TokenRef {i} is a position in this list. */
export type DiagramWords = DiagramWord[];

/** A diagram written by hand (never asked of the tutor) of a real verse or part of one: a step of the diagram lesson (lesson.ts) and a grammar card's
 * 'In a diagram' (src/data/grammar/teach/types.ts) are each one. */
export interface WrittenDiagram {
  /** the verse (or the part of it) the diagram is of, as the screen names it: 'John 11:35' */
  reference: string;
  /** where the words are in the data: the book's code, the chapter, the verse */
  verse: { book: string; chapter: number; verse: number };
  mode: DiagramMode;
  words: DiagramWords;
  diagram: Diagram;
}
