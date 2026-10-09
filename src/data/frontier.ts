// src/data/frontier.ts — the frontier picker (docs/frontier.md): the next new words of the chapter he is reading, and the
// verse where each has the most solid words around it. Pure: the caller hands in the chapter, what he knows and the
// word counts; nothing here reads the store or the network.
import { type Chapter, type GreekWord, wordGloss, wordLemma } from './chapter';
import type { FrequencyEntry } from './frequency';

/** The lemmas (NFC, as listSolidLemmas gives them) he has in each state. A lemma in any of the three is not new. */
export interface Known {
  solid: ReadonlySet<string>;
  learning: ReadonlySet<string>;
  dropped: ReadonlySet<string>;
}

export interface Candidate {
  /** Strong's number, no padding: 'G2316' */
  strongs: string;
  /** the lemma (NFC) */
  lemma: string;
  gloss: string;
  /** how many times the New Testament uses the word; 0 when the frequency table lacks it */
  count: number;
  /** the verses of the chapter the word stands in, in order */
  verses: number[];
}

const lemmaOf = (w: GreekWord): string => wordLemma(w).normalize('NFC');

interface Found extends Candidate {
  proper: boolean;
  /** how many times it stands in the chapter */
  here: number;
}

/**
 * The words of `chapter` whose lemma is in none of `known`'s three sets, best first: the commonest in the New Testament
 * (`frequency`'s count), then, among equals, the more often in this chapter, then the earlier first verse. A name
 * (`proper` in the table) comes after every other word. At most `n`. A word the table lacks counts 0 and is not a name.
 */
export function pickFrontier(chapter: Chapter, known: Known, frequency: readonly FrequencyEntry[], n: number): Candidate[] {
  const table = new Map(frequency.map((e) => [e.strongs, e]));
  const found = new Map<string, Found>();
  for (const verse of chapter.verses) {
    for (const word of verse.g) {
      const lemma = lemmaOf(word);
      if (!lemma || known.solid.has(lemma) || known.learning.has(lemma) || known.dropped.has(lemma)) continue;
      const seen = found.get(lemma);
      if (seen) {
        seen.here += 1;
        if (seen.verses[seen.verses.length - 1] !== verse.n) seen.verses.push(verse.n);
        continue;
      }
      const entry = table.get(word.s);
      found.set(lemma, {
        strongs: word.s,
        lemma,
        gloss: wordGloss(chapter, word),
        count: entry?.count ?? 0,
        verses: [verse.n],
        proper: entry?.proper ?? false,
        here: 1,
      });
    }
  }
  return [...found.values()]
    .sort((a, b) => Number(a.proper) - Number(b.proper) || b.count - a.count || b.here - a.here || a.verses[0] - b.verses[0])
    .slice(0, Math.max(0, n))
    .map(({ strongs, lemma, gloss, count, verses }) => ({ strongs, lemma, gloss, count, verses }));
}

/**
 * The verse (its number) among `candidate.verses` with the highest share of solid Greek words, so the new word stands
 * among the most help; a tie goes to the verse with the fewest Greek words, then to the earlier one. Null when the
 * chapter has none of the candidate's verses.
 */
export function easiestVerse(candidate: Candidate, chapter: Chapter, solid: ReadonlySet<string>): number | null {
  let best: { n: number; solid: number; total: number } | null = null;
  for (const verse of chapter.verses) {
    if (!candidate.verses.includes(verse.n) || verse.g.length === 0) continue;
    const here = { n: verse.n, solid: verse.g.filter((w) => solid.has(lemmaOf(w))).length, total: verse.g.length };
    if (!best) {
      best = here;
      continue;
    }
    // here.solid / here.total against best.solid / best.total, without dividing
    const lead = here.solid * best.total - best.solid * here.total;
    if (lead > 0 || (lead === 0 && here.total < best.total)) best = here;
  }
  return best?.n ?? null;
}
