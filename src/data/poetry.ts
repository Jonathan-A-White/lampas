// src/data/poetry.ts — a verse of poetry as its lines (docs/data.md 'Poetry lines'): the Berean table's line marks are `Verse.l`, where each line starts as an English chunk and how deep it stands.
import type { GreekWord, Verse } from './chapter';

export interface PoetryLineSpan {
  /** how deep the line stands: 1, or 2 for the deeper lines; 0 for the lead-in (below) */
  indent: 0 | 1 | 2;
  /** the line opens a block, where the stanza breaks */
  stanza: boolean;
  /** the first English chunk of the line */
  from: number;
  /** one past its last chunk */
  to: number;
  /** the line's English, as the chunks run together */
  text: string;
  /** the lead-in: the chunks ahead of a verse's first mark, prose that brings the lines in ('He said:', a Psalm's title), set flush left ahead of them */
  continued: boolean;
}

/**
 * The lines of a verse of poetry, in English order, or null when the verse is prose (it has no `l`). The chunks before the first mark (528 verses: 'Then Mary said:', a Psalm's title, 'He said:') are the verse's lead-in,
 * a line of their own, `continued`, flush left (indent 0).
 */
export function poetryLinesOf(verse: Pick<Verse, 'e' | 'l'>): PoetryLineSpan[] | null {
  const marks = verse.l;
  if (!marks?.length) return null;
  const lines: PoetryLineSpan[] = [];
  const text = (from: number, to: number): string => verse.e.slice(from, to).map((c) => c.t.trim()).filter(Boolean).join(' ');
  if (marks[0][0] > 0) lines.push({ indent: 0, stanza: false, from: 0, to: marks[0][0], text: text(0, marks[0][0]), continued: true });
  marks.forEach(([chunk, indent, stanza], i) => {
    const to = i + 1 < marks.length ? marks[i + 1][0] : verse.e.length;
    lines.push({ indent, stanza: stanza === 1, from: chunk, to, text: text(chunk, to), continued: false });
  });
  return lines;
}

/** The books whose verses are in the poetic accents (the three: Psalms, Job, Proverbs), where oleh-weyored and the atnach divide a verse; every other book is in the prose accents, where the atnach does and the zaqef divides a long half. */
const POETIC_BOOKS: ReadonlySet<string> = new Set(['psa', 'job', 'pro']);
const ATNACH = '\u0591';
const OLEH = '\u05AB';
/** the yored: the sign under the stress that completes an oleh-weyored (it is the merkha's code point) */
const YORED = '\u05A5';
const ZAQEF = /[\u0594\u0595]/;
/** A half of a verse in the prose accents longer than this many words is broken again at its zaqefs: a line of seven words is about what the phone's width holds in Hebrew type. */
export const LONG_HALF = 7;

/**
 * Where the lines of a Hebrew verse of poetry start, as indexes into its words, from the Masoretic accents (docs/data.md 'Poetry lines', mw-5r3p30.1165): a line ends at the word that carries the major accent. In Psalms, Job
 * and Proverbs that is oleh-weyored (the oleh and its yored, on one word or the oleh's word and the next) and the atnach; in every other book the atnach, and then, in a half longer than LONG_HALF words, each zaqef. Always starts with 0;
 * just [0] (no line to break) when the verse has no such accent, which the caller draws as running text.
 */
export function hebrewLineStarts(words: readonly Pick<GreekWord, 't'>[], code: string): number[] {
  const poetic = POETIC_BOOKS.has(code);
  const ends = new Set<number>();
  words.forEach(({ t }, i) => {
    if (t.includes(ATNACH)) ends.add(i);
    else if (poetic && t.includes(OLEH)) {
      // the yored is on the oleh's own word, or on the word that follows it ('פַּלְגֵ֫י מָ֥יִם')
      ends.add(t.includes(YORED) ? i : words[i + 1]?.t.includes(YORED) ? i + 1 : i);
    }
  });
  if (!poetic) {
    // a half (the words up to the atnach, or after it) of more than LONG_HALF words is broken at its zaqefs
    let from = 0;
    for (const end of [...[...ends].sort((a, b) => a - b), words.length - 1]) {
      if (end - from + 1 > LONG_HALF) for (let i = from; i < end; i++) if (ZAQEF.test(words[i].t) && i > from) ends.add(i);
      from = end + 1;
    }
  }
  return [0, ...[...ends].filter((i) => i < words.length - 1).sort((a, b) => a - b).map((i) => i + 1)];
}

/**
 * The lines of a Hebrew verse of poetry (the Hebrew tab), or null when the verse is prose or has no accent to break at. They are the verse's `hl` (fillChapter sets it, from hebrewLineStarts and the book's code), each of indent 1, hung;
 * `from` and `to` are indexes into the verse's Hebrew words, `g`. The lead-in and the stanza are the English's alone.
 */
export function hebrewLinesOf(verse: Pick<Verse, 'g' | 'hl'>): PoetryLineSpan[] | null {
  const starts = verse.hl;
  if (!starts || starts.length < 2) return null;
  return starts.map((from, k) => {
    const to = k + 1 < starts.length ? starts[k + 1] : verse.g.length;
    return { indent: 1, stanza: false, from, to, text: verse.g.slice(from, to).map((w) => w.t).join(' '), continued: false };
  });
}
