// src/diagram/hebrewPieces.ts — a Hebrew word cut into the parts a diagram draws on their own (mw-5r3p30.887): the article, a prefixed preposition and the conjunction vav, each split from the
// word they are written onto, and the word itself. The cut follows the data's parsing ('Conj-w, Prep-b, Art | N-ms': the tags before the first ' | ' that is not a prefix are the prefixes) and is
// checked against the letters, so a word the parse and the letters disagree on stays whole rather than cut wrong. Pure: no store, no network.
import type { GreekWord } from '../data/chapter';

/** One piece of a Hebrew word: its pointed text, its English gloss ('' where it has none), and its part of the word's parsing. */
export interface HebrewPiece {
  text: string;
  gloss: string;
  parse: string;
  /** a prefix (the article, a preposition, vav) rather than the word itself */
  prefix: boolean;
}

/** The prefixes the diagram draws apart, with the letter each is written as and its gloss. */
const PREFIXES: Record<string, { letter: string; gloss: string }> = {
  'Conj-w': { letter: 'ו', gloss: 'and' },
  'Prep-b': { letter: 'ב', gloss: 'in' },
  'Prep-k': { letter: 'כ', gloss: 'like' },
  'Prep-l': { letter: 'ל', gloss: 'to' },
  'Prep-m': { letter: 'מ', gloss: 'from' },
  Art: { letter: 'ה', gloss: 'the' },
};
/** After these the article's ה is not written: בְּ + הַ is בַּ, one letter for two tags. */
const SWALLOWS_ARTICLE = new Set(['Prep-b', 'Prep-k', 'Prep-l']);
/** A letter with its points and accents: a cluster. */
const CLUSTER = /[א-ת][֑-ׇֽֿׁׂׅׄ]*/gu;

const whole = (word: GreekWord, gloss: string, text: string): HebrewPiece[] => [{ text, gloss, parse: word.p, prefix: false }];

/** The pieces of `text` (the word as the verse has it, no marks at its ends) in the order of the text: its prefixes, then the word. `gloss` is the word's own. */
export function hebrewPieces(word: GreekWord, gloss: string, text: string = word.t): HebrewPiece[] {
  const segments = word.p.split('|').map((s) => s.trim());
  const groups: string[][] = [];
  let used = 0;
  for (; used < segments.length - 1; used += 1) {
    const tags = segments[used].split(',').map((t) => t.trim());
    if (!tags.every((t) => t in PREFIXES)) break;
    for (const tag of tags) {
      const last = groups[groups.length - 1];
      if (tag === 'Art' && last && SWALLOWS_ARTICLE.has(last[last.length - 1])) last.push(tag);
      else groups.push([tag]);
    }
  }
  if (groups.length === 0) return whole(word, gloss, text);
  const clusters = [...text.matchAll(CLUSTER)];
  const rest = clusters[groups.length];
  if (!rest || rest.index === undefined) return whole(word, gloss, text);
  if (groups.some((g, k) => clusters[k][0][0] !== PREFIXES[g[0]].letter)) return whole(word, gloss, text);
  const prefixes = groups.map((g, k) => ({ text: clusters[k][0], gloss: g.map((t) => PREFIXES[t].gloss).join(' '), parse: g.join(', '), prefix: true }));
  return [...prefixes, { text: text.slice(rest.index), gloss, parse: segments.slice(used).join(' | '), prefix: false }];
}
