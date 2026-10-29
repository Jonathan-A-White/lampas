// src/data/rp2026English.ts — the English of the RP 2026 wording changes, laid on a chapter while Settings > Reading > 'English from the 2026 Greek' is On (mw-9ji6ek0.33).
// data/rp2026-english.json (mw-9ji6ek0.32, scripts/data/rp2026English.ts) says, for each place where the 2026 Greek differs from the Greek the MSB translated, whether the English
// changes and gives Lampas's own for the MSB's words of the span. Here the Reader reads that file: a chapter with such a place has the span's chunks made one chunk of Lampas's words,
// marked with the entry's key. The file's Greek and the chapters' Greek are the 2026 text already (the build laid it on, docs/data.md 'The RP 2026 overlay'); only the English is laid here.
import { bookOf } from './books';
import type { Chapter, EnglishChunk, Verse } from './chapter';
import entries from '../../data/rp2026-english.json';

export type Rp2026Setting = 'off' | 'on';

/** One entry of data/rp2026-english.json (scripts/data/rp2026English.ts has its fuller type), with the key it is filed under. */
export interface Rp2026Entry {
  key: string;
  ref: string;
  /** the 2018 words and the 2026 words of the change */
  from: string[];
  to: string[];
  changesEnglish: boolean;
  /** the MSB's English for the span */
  msb: string;
  /** Lampas's English for it, set exactly when `changesEnglish` */
  lampas: string | null;
  note: string;
  provenance: {
    greek: { source: string; licence: string };
    msb: string;
    decision: { model: string; date: string };
    rendering?: { kind: string; model: string; date: string };
  };
}

const ALL: readonly Rp2026Entry[] = Object.entries(entries as Record<string, Omit<Rp2026Entry, 'key'>>).map(([key, e]) => ({ ...e, key }));

/** The entry for `book chapter:verse` ('Philemon', 1, 1) when the 2026 Greek changes the English there; none when the verse has no change or the change leaves the English alone. */
export function rp2026Entry(book: string, chapter: number, verse: number): Rp2026Entry | undefined {
  return ALL.find((e) => e.changesEnglish && !!e.lampas && e.ref === `${book} ${chapter}:${verse}`);
}

/** The entry filed under `key` (the key a laid chunk carries). */
export const rp2026EntryByKey = (key: string): Rp2026Entry | undefined => ALL.find((e) => e.key === key);

const words = (text: string): string[] => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
const LEAD = /^[^\p{L}\p{N}]+/u;
const TRAIL = /[^\p{L}\p{N}]+$/u;

/** The first run of chunks whose words are the entry's MSB words (punctuation and case aside), as [from, to] indices into `verse.e`; none when the MSB's words are not there. */
function spanOf(verse: Verse, msb: string): [number, number] | undefined {
  const want = words(msb).join(' ');
  for (let a = 0; a < verse.e.length; a++) {
    let got: string[] = [];
    for (let b = a; b < verse.e.length; b++) {
      got = got.concat(words(verse.e[b].t));
      const text = got.join(' ');
      if (text === want) return [a, b];
      if (!want.startsWith(text)) break;
    }
  }
  return undefined;
}

/** One verse with Lampas's English in the place of the MSB's words of `entry`, or the verse itself when those words are not there. The span's chunks become one chunk: Lampas's words with the
 * first chunk's opening marks and the last one's closing ones, holding the Greek words of them all, marked `rp`; every Greek word's `e` follows the chunks that moved up. */
function layVerse(verse: Verse, entry: Rp2026Entry): Verse {
  const span = spanOf(verse, entry.msb);
  if (!span || !entry.lampas) return verse;
  const [a, b] = span;
  const chunks = verse.e.slice(a, b + 1);
  const lead = LEAD.exec(chunks[0].t)?.[0] ?? '';
  const trail = TRAIL.exec(chunks[chunks.length - 1].t)?.[0] ?? '';
  const merged: EnglishChunk = { t: `${lead}${entry.lampas}${trail}`, g: chunks.flatMap((c) => c.g).sort((x, y) => x - y), rp: entry.key };
  const e = [...verse.e.slice(0, a), merged, ...verse.e.slice(b + 1)];
  const g = verse.g.map((w) => (w.e === undefined ? w : w.e >= a && w.e <= b ? { ...w, e: a } : w.e > b ? { ...w, e: w.e - (b - a) } : w));
  return { ...verse, g, e };
}

/** `chapter` with the English of the RP 2026 changes laid on while the setting is On; the chapter itself, untouched, when it is Off or the chapter has no such place. */
export function layRp2026English(chapter: Chapter, setting: Rp2026Setting): Chapter {
  if (setting !== 'on') return chapter;
  const name = bookOf(chapter.code)?.name ?? chapter.book;
  let changed = false;
  const verses = chapter.verses.map((v) => {
    const entry = rp2026Entry(name, chapter.chapter, v.n);
    const laid = entry ? layVerse(v, entry) : v;
    if (laid !== v) changed = true;
    return laid;
  });
  return changed ? { ...chapter, verses } : chapter;
}
