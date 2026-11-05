// src/reftagger/passage.ts — what the blog's popup (popup.ts, mw-5r3p30.1048) shows for a tagged reference: the passage its link names, its heading, the address of the chapter file
// that holds the Majority Standard Bible's English, and the verses read out of that file. Pure: no page and no network. The link is read back, never the text beside it, so the
// popup and the link agree by construction (tagger.ts addressOf wrote `ref=John.5.24-29`).
import { LINK_ORIGIN } from '../config';
import { BOOKS } from '../data/books';
import { OSIS, OT_OSIS } from '../nav/links';

/** The passage a tagged link names: the book's code ('jhn'), the chapter, and the verses when it gives them (`last` is `first` for one verse). */
export interface TaggedPassage {
  code: string;
  chapter: number;
  first?: number;
  last?: number;
}

const BY_OSIS: ReadonlyMap<string, string> = new Map([...Object.entries(OSIS), ...Object.entries(OT_OSIS)].map(([code, osis]) => [osis, code]));

/** The passage a tagged link's address names ('https://lampas.allmymind.org/#/?ref=John.5.24-29'), or null for an address that names none the app holds. */
export function passageOf(href: string): TaggedPassage | null {
  const ref = /[?&]ref=([^&#]+)/.exec(href)?.[1];
  const m = ref ? /^([0-9A-Za-z]+)\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/.exec(decodeURIComponent(ref)) : null;
  const code = m ? BY_OSIS.get(m[1]) : undefined;
  if (!m || !code) return null;
  const first = m[3] === undefined ? undefined : Number(m[3]);
  const last = first === undefined ? undefined : Math.max(first, m[4] === undefined ? first : Number(m[4]));
  return { code, chapter: Number(m[2]), ...(first === undefined ? {} : { first, last }) };
}

/** The heading: 'John 5:25', 'John 5:24-29', 'Psalm 23:1', and a chapter alone is 'John 11'. */
export function headingOf(p: TaggedPassage): string {
  const name = (BOOKS.find((b) => b.code === p.code)?.name ?? p.code).replace(/^Psalms$/, 'Psalm');
  if (p.first === undefined) return `${name} ${p.chapter}`;
  return `${name} ${p.chapter}:${p.first}${p.last !== undefined && p.last > p.first ? `-${p.last}` : ''}`;
}

/** The chapter's file, which the app's own build writes (public/data/<book>/<chapter>.json) and the page that loaded the script fetches across origins: from `origin`, the one the
 *  script itself came from (the app's, for the blog, which loads https://lampas.allmymind.org/reftagger.js; a spec serves both from a server of its own). */
export const chapterUrl = (p: TaggedPassage, origin: string = LINK_ORIGIN): string => `${origin}/data/${p.code}/${p.chapter}.json`;

/** One verse as the popup shows it. */
export interface ShownVerse {
  n: number;
  text: string;
}

/** The verses of a chapter file the passage names (a chapter alone names its first), each as the MSB's English runs in order; [] when the file holds none of them. */
export function versesOf(file: unknown, p: TaggedPassage): ShownVerse[] {
  const verses = (file as { verses?: { n?: unknown; e?: { t?: unknown }[] }[] } | null)?.verses;
  if (!Array.isArray(verses)) return [];
  const first = p.first ?? 1;
  const last = p.first === undefined ? 1 : (p.last ?? first);
  const shown: ShownVerse[] = [];
  for (const v of verses) {
    if (typeof v?.n !== 'number' || v.n < first || v.n > last || !Array.isArray(v.e)) continue;
    const text = v.e.map((c) => (typeof c?.t === 'string' ? c.t : '')).join(' ').replace(/\s+/g, ' ').trim();
    if (text) shown.push({ n: v.n, text });
  }
  return shown;
}
