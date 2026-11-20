// src/memorize/pieces.ts — how Memorize cuts a long passage into pieces (docs/layout/memorize.md 'Pieces', mw-5r3p30.1205). Pure. A passage too long to learn at once ('this is too much to memorize at once',
// Exodus 20:1-17, his feedback 2026-11-18) is learned a piece at a time and then joined; a piece is a run of whole verses, cut where the passage breaks of itself:
//   1. at a unit the cutter knows (UNITS: the Ten Commandments, one commandment a piece);
//   2. else at the chapter's own paragraphs (the MSB's `p`), a paragraph too long cut to PIECE_VERSES, one too short joined to its neighbour;
//   3. else, a run with no break it knows, a fixed number of verses (PIECE_VERSES), as even as they go.
// A single verse, or a passage of SHORT_PASSAGE verses or fewer, is one piece: a session as it was.
import type { Verse } from '../data/chapter';

/** A passage of this many verses or fewer is one piece. */
export const SHORT_PASSAGE = 5;
/** The most verses a piece has when the cutter has only a count to go by. */
export const PIECE_VERSES = 4;
/** A paragraph shorter than this joins the one after it (the last, the one before). */
const MIN_PIECE = 2;

/**
 * The units the cutter knows: the verse each begins at, by the data's book id and chapter. The Ten Commandments as the Reformed churches number them: the preface (verses 1-2), then the
 * first commandment (3), the second (4-6), the third (7), the fourth (8-11), the fifth to the tenth (12 to 17); Deuteronomy 5 repeats them from verse 6. PROVISIONAL, the Governor to confirm.
 */
export const UNITS: Readonly<Record<string, readonly number[]>> = {
  'exo.20': [1, 3, 4, 7, 8, 12, 13, 14, 15, 16, 17],
  'deu.5': [6, 7, 11, 12, 16, 17, 18, 19, 20, 21],
};

type Numbered = Pick<Verse, 'n'> & { p?: 1 };

/** Runs of `verses` that begin at each verse `starts` says (the first run begins at the first verse). */
function cutAt<T extends Numbered>(verses: readonly T[], starts: (verse: T, index: number) => boolean): T[][] {
  const runs: T[][] = [];
  verses.forEach((verse, i) => {
    if (i === 0 || starts(verse, i)) runs.push([verse]);
    else runs[runs.length - 1].push(verse);
  });
  return runs;
}

/** A run cut into the fewest pieces of PIECE_VERSES verses or fewer, as even as they go (13 verses: 4, 3, 3, 3). */
function evenly<T>(run: readonly T[]): T[][] {
  const count = Math.ceil(run.length / PIECE_VERSES);
  const base = Math.floor(run.length / count);
  const extra = run.length % count;
  const pieces: T[][] = [];
  let at = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    pieces.push(run.slice(at, at + size));
    at += size;
  }
  return pieces;
}

/** Paragraphs too short to stand alone are joined: onto the next, the last onto the one before it. */
function joinShort<T>(runs: T[][]): T[][] {
  const joined: T[][] = [];
  let carry: T[] = [];
  for (const run of runs) {
    const merged = [...carry, ...run];
    if (merged.length < MIN_PIECE) carry = merged;
    else {
      joined.push(merged);
      carry = [];
    }
  }
  if (carry.length > 0) {
    if (joined.length > 0) joined[joined.length - 1].push(...carry);
    else joined.push(carry);
  }
  return joined;
}

/**
 * The pieces of a passage: its verses (the Verse objects of a chapter, in order) cut as the header says. `book` is the data's book id ('exo') and `chapter` its number. An empty passage has no piece.
 */
export function piecesOf<T extends Numbered>(book: string, chapter: number, verses: readonly T[]): T[][] {
  if (verses.length === 0) return [];
  if (verses.length <= SHORT_PASSAGE) return [[...verses]];
  const known = UNITS[`${book}.${chapter}`];
  // a unit the cutter knows is a piece as it stands; the passage may begin or end inside the chapter's units
  if (known && cutAt(verses, (v) => known.includes(v.n)).length > 1) return cutAt(verses, (v) => known.includes(v.n));
  return joinShort(cutAt(verses, (v) => v.p === 1)).flatMap(evenly);
}

/** The heading of a piece: the passage's own ('Exodus 20:1-17') with the piece's verses, 'Exodus 20:4-6', 'Exodus 20:3'. */
export function pieceHeading(heading: string, piece: readonly Pick<Verse, 'n'>[]): string {
  const first = piece[0].n;
  const last = piece[piece.length - 1].n;
  return `${heading.replace(/:.*$/, '')}:${first}${last > first ? `-${last}` : ''}`;
}
