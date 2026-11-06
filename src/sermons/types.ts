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
  /** whether its switch starts On or Off */
  default: 'on' | 'off';
  /** The source's sermons whose preaching text touches `place`'s chapter, in the source's order (verse order); [] where it has none. The module narrows them to the verses (src/sermons/sermonsFor.ts). */
  sermonsFor(place: SermonPlace): Promise<SermonRow[]>;
}

/** What a place has: `here` the sermons whose preaching text overlaps the verse or passage (narrower first), `chapter` the rest of the chapter. A whole chapter has everything in `chapter`. */
export interface SermonsFound {
  here: SermonRow[];
  chapter: SermonRow[];
}
