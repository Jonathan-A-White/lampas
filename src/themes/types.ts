// src/themes/types.ts — the themes module's shapes (docs/sermons.md 'The themes', modelled on src/sermons/types.ts). A ThemeSource answers, for a book, the topics it has links in and those links; the Themes line and the
// sheet's 'On the same theme' rows know only these, so another theme system is one file in src/themes/sources/ and a line in the registry (src/themes/index.ts).
import type { SermonRef } from '../data/sermonIndex';

export type { SermonRef } from '../data/sermonIndex';

/** A numbered part of a topic: Thompson's "(4) Of God". */
export interface ThemePart {
  n: number;
  label: string;
}

export interface Topic {
  /** unique within its source */
  id: string;
  label: string;
  /** the parts the book's links use */
  parts: ThemePart[];
  /** how many verses all the topic's links cover together, in every book, a verse once (the sermon join uses a topic of at most THEME_MAX_VERSES) */
  verses: number;
  /** the books the topic has links in (Lampas's codes, canon order); absent for a topic the join does not use */
  books?: string[];
}

/** A link of a topic (of one of its parts, when the source names it) to a passage. */
export interface Link {
  topic: string;
  part?: number;
  ref: SermonRef;
}

/** What a theme source holds for one book. */
export interface ThemeBook {
  topics: Topic[];
  links: Link[];
}

export interface ThemeSource {
  id: string;
  name: string;
  homepage: string;
  /** the credit line shown with every theme of this source */
  credit: string;
  /** one line for the source's row in Settings > Study resources > Themes */
  describe: string;
  /** whether its switch starts On or Off */
  default: 'on' | 'off';
  /** The topics and links of `book`; empty where the source has none. */
  book(book: string): Promise<ThemeBook>;
}

/** Where themes are asked for: a verse (`from` alone) or a passage (`from` and `to`) of a chapter. A whole chapter has no Themes line. */
export interface ThemePlace {
  book: string;
  chapter: number;
  from?: number;
  to?: number;
}

/** A topic that has a link on the verse or passage: what the Themes line names and what the sermon join starts from. */
export interface Theme {
  source: string;
  sourceName: string;
  topic: string;
  label: string;
  /** the numbered part of the topic the narrowest link on the place names (then the lowest part), with its label */
  part?: number;
  partLabel?: string;
  verses: number;
  books?: string[];
  /** as the Themes line says it: 'Atonement', or 'Love-Hatred: Of God' where the link names a part */
  text: string;
}
