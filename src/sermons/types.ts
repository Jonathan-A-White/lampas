// src/sermons/types.ts — the sermons module's shapes (docs/sermons.md, modelled on src/maps/types.ts). A SermonSource answers the sermons preached on a chapter as SermonRows; the sheet that shows them
// knows only these, so a second source is one file in src/sermons/sources/ and a line in the registry (src/sermons/index.ts).
import type { SermonRef } from '../data/sermonIndex';

export type { SermonRef } from '../data/sermonIndex';

/** Where in the Bible sermons are asked for: the app's book code (src/data/canon.ts), a chapter, and optionally verses (`from` alone is one verse). No `from` is the whole chapter. */
export interface SermonPlace {
  book: string;
  chapter: number;
  from?: number;
  to?: number;
}

/** 'text' is the passage a sermon was preached on; 'cited' (a later story) is one it quotes. */
export type SermonRole = 'text' | 'cited';

export interface SermonRow {
  /** unique within its source */
  id: string;
  /** the SermonSource.id it came from */
  source: string;
  title: string;
  preacher?: string;
  /** when it was preached, ISO 8601 at the precision the source knows ('1889-07-07', '1889-07', '1889') */
  date?: string;
  /** where the preaching text stands */
  ref: SermonRef;
  role: SermonRole;
  /** where the sermon is read: an app link with its https `fallback` (armFallback), or an https address alone */
  open: { url: string; fallback?: string };
  /** where it opens, for the row's second line: 'web' in the browser, 'logos' in his Logos library */
  opensIn: 'web' | 'logos';
  /** a second address of the sermon (the index's alt_url: a Spurgeon PDF, a church's Subsplash link); the sheet opens it in place of `open` only where it is on Subsplash (subsplashAlt, merge.ts) */
  alt?: string;
}

export interface SermonSource {
  id: string;
  name: string;
  homepage: string;
  /** the credit line shown with every sermon of this source */
  credit: string;
  /** one line for the source's row in Settings > Study resources > Sermons (a later story) */
  describe: string;
  /** the study resource the source rides on: it is left out while that resource is Off */
  needs?: 'logos';
  /** the Logos Resource IDs its rows open in (a ref.ly address): the source is offered, and a row of it listed, only for one his Library import says he owns or Logos gives free (src/library/owned.ts) */
  resources?: readonly string[];
  /** whether its switch starts On or Off */
  default: 'on' | 'off';
  /** The source's sermons whose preaching text touches `place`'s chapter, in the source's order (verse order); [] where it has none. The module narrows them to the verses (src/sermons/sermonsFor.ts). */
  sermonsFor(place: SermonPlace): Promise<SermonRow[]>;
  /** Every one of the source's sermons whose preaching text touches `book`, in verse order; absent where the source cannot say. The sheet's 'On the same theme' rows read it for the books a topic is in (src/sermons/index.ts sameThemeFor). */
  sermonsInBook?(book: string): Promise<SermonRow[]>;
}

/** The topic a sermon came in by on the sheet's 'On the same theme' rows: the theme source and the topic (`verses`: how many verses its links cover in all). */
export interface ThemeTopic {
  source: string;
  id: string;
  label: string;
  verses: number;
}

/**
 * A row on 'On the same theme'. A sermon reached through its preaching text is a SermonRow. One the sermon index service says its source linked to the topic directly (`notes`: from the sermon notes, mw-qtu3zvz.59.2)
 * may have no preaching text (`ref` absent: most of Brookfield First's), and then no role either.
 */
export type ThemeRow = Omit<SermonRow, 'ref' | 'role'> & { ref?: SermonRef; role?: SermonRole; notes?: true };

/** A directly linked row and the topic of the phone's Themes line it was linked to. */
export interface DirectRow {
  row: ThemeRow;
  topic: ThemeTopic;
}

/** The sermons of one topic: the sheet's 'On <topic>' group. */
export interface ThemeGroup<R = SermonRow> {
  topic: ThemeTopic;
  rows: R[];
}

/**
 * 'On the same theme': the groups in order (a topic holding a directly linked sermon first, then the narrower the topic, the earlier), at most THEME_ROW_LIMIT rows in all, and how many more there were.
 * Where the groups can hold directly linked rows the row type is ThemeRow.
 */
export interface SameTheme<R = SermonRow> {
  groups: ThemeGroup<R>[];
  more: number;
}

/** What a place has: `here` the sermons whose preaching text overlaps the verse or passage (narrower first), `chapter` the rest of the chapter. A whole chapter has everything in `chapter`. */
export interface SermonsFound {
  here: SermonRow[];
  chapter: SermonRow[];
}
