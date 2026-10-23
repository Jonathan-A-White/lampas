// src/services/talkVerses.ts — the verses a Bible talk holds (mw-5r3p30.733). The window follows the talk: the verses his newest question names, else those the last
// answer linked, else the selected verse or passage, else the chapter's first verses. The clip of an over-long request drops whole verses, the farthest from the talk's
// verse first, and the request says which verses it holds (`verses`, '2:8-10'), so the tutor names that range when he asks for a verse outside it. Pure.
import type { Chapter, Verse } from '../data/chapter';
import type { AnswerLink } from '../data/db';
import { findReferences } from '../nav/refsInText';
import { parseCanonReference } from '../nav/links';

/** The verses of a chapter a talk about the whole chapter holds. */
export const CHAPTER_VERSES = 3;
/** The verses held beside a verse he names, on each side of it. */
const CONTEXT = 1;
/** The most verses a window made of named verses holds: a question naming verses far apart keeps those nearest the first one named. */
const MAX_WINDOW = 12;

/** One verse (or, when the scope's passage is not in the chapter data, the passage as one) of the window: its numbers, its words and the texts the request carries. */
export interface VersePart {
  n: number;
  to?: number;
  verse: Verse;
  greek: string;
  english: string;
}

/** What a request holds of the chapter's text: the parts in order and the verse the talk is about, which the clip keeps longest. */
export interface TextHold {
  chapter: number;
  parts: VersePart[];
  anchor: number;
}

/** The parts' last verse number. */
const lastOf = (part: VersePart): number => part.to ?? part.n;

/** '2:8-10', '2:9': the chapter and the verses the parts cover, as `verses` of the request says them; none when no verse is held (a chapter the data has no text of). */
export function versesLabel(chapter: number, parts: readonly VersePart[]): string | undefined {
  if (parts.length === 0) return undefined;
  const first = parts[0].n;
  const last = lastOf(parts[parts.length - 1]);
  return last > first ? `${chapter}:${first}-${last}` : `${chapter}:${first}`;
}

/** How far the part is from the verse: 0 when the verse is in it. */
const distance = (part: VersePart, anchor: number): number => (anchor < part.n ? part.n - anchor : anchor > lastOf(part) ? anchor - lastOf(part) : 0);

/** The parts less the one farthest from `anchor` (the last when both ends are as far), or the same when one part is left. */
export function dropFarthest(parts: VersePart[], anchor: number): VersePart[] {
  if (parts.length <= 1) return parts;
  return distance(parts[0], anchor) > distance(parts[parts.length - 1], anchor) ? parts.slice(1) : parts.slice(0, -1);
}

const NUMBERS = String.raw`(\d+)(?:\s*[-–]\s*(\d+))?((?:\s*(?:,|and|&)\s*\d+(?:\s*[-–]\s*\d+)?)*)`;
/** 'verse 9', 'verses 8-10', 'vv. 8, 9 and 12', 'v. 9' */
const VERSE_WORD = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:verses?|vv?|vs)\.?\s*${NUMBERS}`, 'giu');
/** '2:9', '2:9-11' with no book: the chapter must be the talk's own */
const CHAPTER_VERSE = /(?<![\p{L}\p{N}:.])(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?/gu;

const spread = (from: number, to: number | undefined): number[] => (to !== undefined && to > from && to - from < 200 ? Array.from({ length: to - from + 1 }, (_, i) => from + i) : [from]);

/** The verse numbers of the talk's own chapter that `text` names, in the order it names them. */
export function versesNamed(chapter: Chapter, text: string): number[] {
  const found: number[] = [];
  for (const r of findReferences(text)) if (r.testament === 'nt' && r.book === chapter.code && r.chapter === chapter.chapter && r.verse !== undefined) found.push(...spread(r.verse, r.lastVerse));
  for (const m of text.matchAll(VERSE_WORD)) {
    found.push(...spread(Number(m[1]), m[2] === undefined ? undefined : Number(m[2])));
    for (const more of m[3].matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g)) found.push(...spread(Number(more[1]), more[2] === undefined ? undefined : Number(more[2])));
  }
  for (const m of text.matchAll(CHAPTER_VERSE)) if (Number(m[1]) === chapter.chapter) found.push(...spread(Number(m[2]), m[3] === undefined ? undefined : Number(m[3])));
  return found;
}

/** The verse numbers of the talk's own chapter that the verse links of an answer name, in order. */
export function versesLinked(chapter: Chapter, links: readonly AnswerLink[] | undefined): number[] {
  const found: number[] = [];
  for (const link of links ?? []) {
    if (link.kind !== 'verse') continue;
    const r = parseCanonReference(link.reference);
    if (r && r.testament === 'nt' && r.book === chapter.code && r.chapter === chapter.chapter && r.verse !== undefined) found.push(...spread(r.verse, r.to));
  }
  return found;
}

const partOf = (verse: Verse, greek: (v: Verse) => string, english: (v: Verse) => string): VersePart => ({ n: verse.n, ...(verse.to !== undefined && verse.to > verse.n ? { to: verse.to } : {}), verse, greek: greek(verse), english: english(verse) });

/** What a talk is about as a Verse (the selected verse, or a passage under a heading, whose `to` is its last verse) as parts: one part for a verse, one for each verse of a passage the chapter holds. */
function scopeParts(chapter: Chapter, verse: Verse, greek: (v: Verse) => string, english: (v: Verse) => string): VersePart[] {
  if (verse.to === undefined || verse.to <= verse.n) return [partOf(verse, greek, english)];
  const held = chapter.verses.filter((v) => v.n >= verse.n && v.n <= (verse.to ?? verse.n));
  return held.length === verse.to - verse.n + 1 ? held.map((v) => partOf(v, greek, english)) : [partOf(verse, greek, english)];
}

/**
 * The verses a talk holds and the one the clip keeps longest. `verse` is the talk's selected verse or passage (null for the chapter); `question` his newest message and `last` the
 * newest kept answer (its verse links); `named` is false for a quiz, whose passage is the talk, so no verse he names changes it. The verses he names (or the last answer linked) are
 * held with one verse on each side; the selected verse stays held beside them; a chapter talk with nothing named holds its first CHAPTER_VERSES.
 */
export function talkWindow(
  chapter: Chapter,
  verse: Verse | null,
  question: string,
  last: { links?: AnswerLink[] } | undefined,
  named: boolean,
  greek: (v: Verse) => string,
  english: (v: Verse) => string,
): TextHold {
  const have = new Set(chapter.verses.map((v) => v.n));
  const own = verse ? scopeParts(chapter, verse, greek, english) : [];
  // a verse he names that the selected verse or passage holds already adds nothing
  const inOwn = (n: number): boolean => own.some((part) => n >= part.n && n <= lastOf(part));
  const wanted = named ? [...versesNamed(chapter, question), ...versesLinked(chapter, last?.links)].filter((n) => have.has(n) && !inOwn(n)) : [];
  if (wanted.length === 0) {
    const parts = verse ? own : chapter.verses.slice(0, CHAPTER_VERSES).map((v) => partOf(v, greek, english));
    return { chapter: chapter.chapter, parts, anchor: parts[0]?.n ?? 0 };
  }
  const anchor = wanted[0];
  const numbers = new Set<number>(wanted.flatMap((n) => range(n - CONTEXT, n + CONTEXT)).filter((n) => have.has(n)));
  for (const part of own) for (const n of range(part.n, lastOf(part))) numbers.add(n);
  const byNumber = new Map<number, VersePart>(chapter.verses.filter((v) => numbers.has(v.n)).map((v) => [v.n, partOf(v, greek, english)]));
  // the selected verse is held as the talk has it, which a test or a passage the data lacks may not find in the chapter
  for (const part of own) if (part.n === lastOf(part) || !byNumber.has(part.n)) byNumber.set(part.n, part);
  const first = Math.min(...byNumber.keys());
  const lastN = Math.max(...byNumber.keys());
  // one run from the first verse to the last: a gap between two verses named is held too, up to MAX_WINDOW verses of it
  let parts = chapter.verses.filter((v) => v.n >= first && v.n <= lastN).map((v) => byNumber.get(v.n) ?? partOf(v, greek, english));
  if (parts.length === 0) parts = [...byNumber.values()].sort((a, b) => a.n - b.n);
  while (parts.length > MAX_WINDOW) parts = dropFarthest(parts, anchor);
  return { chapter: chapter.chapter, parts, anchor };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

/** The texts of the parts as a request carries them. */
export const textOf = (parts: readonly VersePart[]): { greek: string; english: string } => ({ greek: parts.map((p) => p.greek).join(' '), english: parts.map((p) => p.english).join(' ') });

// The parts a request was built from, kept beside it (not in it) so fitHistory can drop a verse at a time (src/services/talk.ts); a request copied by hand has none and is clipped by characters.
const holds = new WeakMap<object, TextHold>();
export const holdText = <T extends object>(request: T, hold: TextHold): T => {
  holds.set(request, hold);
  return request;
};
export const heldText = (request: object): TextHold | undefined => holds.get(request);
