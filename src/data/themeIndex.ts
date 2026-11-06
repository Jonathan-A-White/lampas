// src/data/themeIndex.ts — public/themes/index.json held in the bundle: the theme sources (Thompson's 1934 subject index, Torrey's New Topical Textbook; licence, credit, counts, the books each has links in, a fingerprint)
// and the shape of a book's file (public/themes/<source>/<book>.json), both written by `npm run sermons:build` (scripts/sermons-build.ts, scripts/sermons/themes.ts; docs/sermons.md 'The themes').
// Held in the bundle, as sermonIndex.ts holds public/sermons/index.json, for what must answer at once; the book files are fetched on first use as /themes/<source>/<book>.json?v=<fingerprint> and kept by the worker (dataCache.ts).
import index from '../../public/themes/index.json' with { type: 'json' };

/** A numbered part of a topic: Thompson's "(4) Of God", Torrey's "Described as: Sovereign". */
export interface ThemePartFile {
  n: number;
  label: string;
}

/** A topic as one book's file holds it. `parts` are the ones that book's links use; `verses` is how many verses all the topic's links cover together, in every book, a verse counted once. */
export interface ThemeTopicFile {
  id: string;
  label: string;
  parts: ThemePartFile[];
  verses: number;
  /** the books (Lampas's codes, canon order) the topic has links in; left out for a topic over THEME_MAX_VERSES, which the sheet's sermon join does not use */
  books?: string[];
}

/**
 * A link of a topic (and of a numbered part of it, when the source gives one) to a passage of this file's book: `chapter.verse`, `chapter.from-to` or `chapter.from-chapter.to` ('5.8', '23.1-6', '5.12-6.4').
 */
export interface ThemeLinkFile {
  topic: string;
  part?: number;
  ref: string;
}

/** public/themes/<source>/<book>.json */
export interface ThemeBookFile {
  topics: ThemeTopicFile[];
  links: ThemeLinkFile[];
}

export interface ThemeSourceEntry {
  id: string;
  name: string;
  /** the terms, quoted from the source's own file */
  licence: string;
  credit: string;
  homepage: string;
  /** the topics with at least one link Lampas can hold */
  topics: number;
  /** the links listed, as the book files hold them */
  links: number;
  /** the books with a file, in canon order */
  books: string[];
  /** the first 12 hex of a SHA-256 over the source's book files: a file is asked for as ?v=<fingerprint>, so a changed source is fetched again */
  fingerprint: string;
}

export interface ThemeIndex {
  sources: ThemeSourceEntry[];
}

/** The widest topic the sermon join uses, in verses: the sermon-index service's `ThemeMaxVerses` (docs/sermons.md 'On the same theme'). */
export const THEME_MAX_VERSES = 300;

export const THEME_INDEX: ThemeIndex = index as ThemeIndex;

/** The address of a source's book file: /themes/<source>/<book>.json?v=<fingerprint>; plain when `from` has no such source. */
export function themeBookUrl(source: string, book: string, from: ThemeIndex = THEME_INDEX): string {
  const fingerprint = from.sources.find((s) => s.id === source)?.fingerprint;
  return `/themes/${source}/${book}.json${fingerprint ? `?v=${fingerprint}` : ''}`;
}

/** A link's `ref` read back: the chapter, the verses, and the chapter they end in when it is not the first. */
export function parseLinkRef(ref: string): { chapter: number; from: number; to: number; toChapter?: number } | undefined {
  const match = /^(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?$/.exec(ref);
  if (!match) return undefined;
  const chapter = Number(match[1]);
  const from = Number(match[2]);
  const to = match[4] === undefined ? from : Number(match[4]);
  const toChapter = match[3] === undefined ? undefined : Number(match[3]);
  return { chapter, from, to, ...(toChapter === undefined || toChapter === chapter ? {} : { toChapter }) };
}
