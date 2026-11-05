// src/reftagger/passage.ts — what the blog's popup (popup.ts, mw-5r3p30.1048) shows for a tagged reference: the passage its link names, its heading, the address of the chapter file
// that holds the chapter's English (a small file of its own, not the chapter file), the translation it is from, and the verses read out of it. Pure: no page and no network. The link is read back, never the text beside it, so the
// popup and the link agree by construction (tagger.ts addressOf wrote `ref=John.5.24-29`).
import { LINK_ORIGIN } from '../config';
import { BOOKS } from '../data/books';
import { OSIS, OT_OSIS } from '../nav/links';
import { spaced, type ShownVerse } from './verses';

/** The passage a tagged link names: the book's code ('jhn'), the chapter, and the verses when it gives them (`last` is `first` for one verse); `lastChapter` is where a chapter range
 *  ('Matthew 5-7') ends (the link itself goes to its first chapter). */
export interface TaggedPassage {
  code: string;
  chapter: number;
  first?: number;
  last?: number;
  lastChapter?: number;
}

/** The code of the book an OSIS name ('1Kgs') is, read back out of links.ts's own two tables (the one place book names are kept). */
const codeOfOsis = (osis: string): string | undefined => [...Object.entries(OSIS), ...Object.entries(OT_OSIS)].find(([, name]) => name === osis)?.[0];

/** The passage a tagged link's address names ('https://lampas.allmymind.org/#/?ref=John.5.24-29'), or null for an address that names none the app holds. `to` is the last chapter of a
 *  chapter range, which the address does not carry (tagger.ts writes it on the link): it counts for a chapter alone and only when it ends after the first. */
export function passageOf(href: string, to?: number): TaggedPassage | null {
  const ref = /[?&]ref=([^&#]+)/.exec(href)?.[1];
  const m = ref ? /^([0-9A-Za-z]+)\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/.exec(decodeURIComponent(ref)) : null;
  const code = m ? codeOfOsis(m[1]) : undefined;
  if (!m || !code) return null;
  const first = m[3] === undefined ? undefined : Number(m[3]);
  const last = first === undefined ? undefined : Math.max(first, m[4] === undefined ? first : Number(m[4]));
  const chapter = Number(m[2]);
  return { code, chapter, ...(first === undefined ? (to !== undefined && to > chapter ? { lastChapter: to } : {}) : { first, last }) };
}

/** A chapter alone or a chapter range names more than the one verse the card shows (its first): the card says so. */
export const isOnlyTheStart = (p: TaggedPassage): boolean => p.first === undefined;

/** The heading: 'John 5:25', 'John 5:24-29', 'Psalm 23:1', a chapter alone is 'John 11' and a chapter range 'Matthew 5-7'. */
export function headingOf(p: TaggedPassage): string {
  const name = (BOOKS.find((b) => b.code === p.code)?.name ?? p.code).replace(/^Psalms$/, 'Psalm');
  if (p.first === undefined) return `${name} ${p.chapter}${p.lastChapter === undefined ? '' : `-${p.lastChapter}`}`;
  return `${name} ${p.chapter}:${p.first}${p.last !== undefined && p.last > p.first ? `-${p.last}` : ''}`;
}

/** The small file of a chapter's English (public/data/verses-<book>-<chapter>.json, written by scripts/verses-build.ts from the chapter file): a few KB of text where the chapter file is
 *  about 177 KB for John 5 (the Greek and every word's parsing too). It is under /data/, as the host's cross-origin header is (docs/links.md 'The blog's popup'), and the page that
 *  loaded the script fetches it from `origin`, the one the script itself came from (the app's, for the blog, which loads https://lampas.allmymind.org/reftagger.js; a spec serves both from a server of its own). */
export const versesUrl = (p: TaggedPassage, origin: string = LINK_ORIGIN): string => `${origin}/data/verses-${p.code}-${p.chapter}.json`;

/** The verses of a chapter's small file the passage names (a chapter alone, or a range of chapters, names its first verse); [] when the file holds none of them. */
export function versesOf(file: unknown, p: TaggedPassage): ShownVerse[] {
  const held = (file as { v?: unknown } | null)?.v;
  if (typeof held !== 'object' || held === null || Array.isArray(held)) return [];
  const first = p.first ?? 1;
  const last = p.first === undefined ? 1 : (p.last ?? first);
  const shown: ShownVerse[] = [];
  // the keys, not a count up to `last`: a link written by hand may name verse 999999999
  for (const key of Object.keys(held)) {
    const n = Number(key);
    const raw = (held as Record<string, unknown>)[key];
    const text = typeof raw === 'string' ? spaced(raw) : '';
    if (Number.isInteger(n) && n >= first && n <= last && text) shown.push({ n, text });
  }
  shown.sort((a, b) => a.n - b.n);
  return shown;
}
