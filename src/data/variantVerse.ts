// src/data/variantVerse.ts — whether a variant reading changes the English of its VERSE, not just of its own words (mw-9ji6ek0.14). A unit's English is
// the model's or the MSB footnote's short snippet ('that' / 'that I'); the verse may already say the difference ('that I love you': the verb carries the
// 'I'), so the reading is compared in place: the verse's English with the unit's words' chunks replaced by the reading's English, against the verse itself. Pure and import-free so the data build (scripts/data/variantEnglish.ts) and the Reader (src/reader/variants.ts) share it.
import type { Verse } from './chapter';

/** An English reading with case, punctuation and white space set aside, for comparing two. */
export const plainEnglish = (s: string): string =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const words = (s: string): string[] => plainEnglish(s).split(' ').filter(Boolean);

/** How many words at the end of `a` are also the start of `b` (the longest such run). */
function overlap(a: readonly string[], b: readonly string[]): number {
  for (let k = Math.min(a.length, b.length); k > 0; k--) if (a.slice(a.length - k).join(' ') === b.slice(0, k).join(' ')) return k;
  return 0;
}

/**
 * The verse's English (plain words) with the chunks that hold `unitWords` replaced by `replacement`: the first such chunk's place takes it, the
 * others go. A word of the replacement that the verse already says next to it ('that I' before 'I love') is not said twice.
 */
export function spliceVerse(verse: Pick<Verse, 'e'>, unitWords: readonly number[], replacement: string): string {
  const held = new Set(unitWords);
  const at = verse.e.findIndex((c) => c.g.some((i) => held.has(i)));
  if (at < 0) return words(verse.e.map((c) => c.t).join(' ')).join(' ');
  const rest = (from: number, to: number) => words(verse.e.slice(from, to).filter((c) => !c.g.some((i) => held.has(i))).map((c) => c.t).join(' '));
  const before = rest(0, at);
  const after = rest(at + 1, verse.e.length);
  let mine = words(replacement);
  mine = mine.slice(overlap(before, mine));
  mine = mine.slice(0, mine.length - overlap(mine, after));
  return [...before, ...mine, ...after].join(' ');
}

/**
 * True when the reading's English leaves the verse's English as the base's does: the two snippets agree, or the verse reads exactly as it is with either one
 * spliced in place of the unit's words ('that' or 'that I' before 'I love you': the verb already says the 'I'). Both have to give the verse itself, so a
 * snippet that is not a faithful part of the verse (it drops words of a chunk, or the MSB's English already follows the other reading: 'the scroll' / 'the book')
 * leaves the reading counted as a change. Without the verse (or when no chunk holds the unit's words) only the two snippets are compared.
 */
export function sameInVerse(verse: Pick<Verse, 'e'> | undefined, unitWords: readonly number[], base: string, alt: string): boolean {
  if (plainEnglish(alt) === plainEnglish(base)) return true;
  if (!verse || !verse.e.some((c) => c.g.some((i) => unitWords.includes(i)))) return false;
  const text = words(verse.e.map((c) => c.t).join(' ')).join(' ');
  return spliceVerse(verse, unitWords, alt) === text && spliceVerse(verse, unitWords, base) === text;
}
