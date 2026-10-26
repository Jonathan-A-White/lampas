/** One entry of a generated seed: the lemma as BMA shows it, its gloss, its lowest lesson, its part of speech, and its language. */
export interface SeedWord {
  lemma: string;
  /** The language the word is in; absent means 'grc', so the Greek seed (src/data/seed-words.ts) carries none. The Hebrew seed (seed-words-hbo.ts) says 'hbo' on every entry. */
  lang?: 'grc' | 'hbo';
  gloss: string;
  lesson: number;
  pos: string;
}
