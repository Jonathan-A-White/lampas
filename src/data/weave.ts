// src/data/weave.ts — the diglot weave: which English chunks of a verse are shown as their Greek instead.
import { type GreekWord, type Verse, wordLemma } from './chapter';

/** The Greek words to show in place of English chunk `i` (in the chunk's own order), or null when it stays English.
 * `learning` is true when at least one of them is a word he is still learning: the Reader sets the chunk's English
 * in small grey beneath the Greek until the word turns solid. */
export type Woven = { words: GreekWord[]; learning: boolean } | null;

/** The lemmas the weave knows (NFC): the solid ones, and with Weave 'Solid and learning words' the learning ones too. */
export interface WeaveLemmas {
  solid: ReadonlySet<string>;
  learning?: ReadonlySet<string>;
}

/**
 * Weaves one verse: a chunk is woven only when it has Greek words, none of its Greek positions is missing, it is
 * not a '-' or a chunk with supplied words, and every one of its Greek words has a lemma in `solid` or `learning`.
 * A chunk with any learning word is marked `learning`. A chunk that cannot be read is left English on its own; it
 * never changes its neighbours.
 */
export function weaveVerse(verse: Verse, { solid, learning }: WeaveLemmas): Woven[] {
  return verse.e.map((chunk) => {
    if (chunk.s || chunk.t.trim() === '-' || chunk.g.length === 0) return null;
    const words: GreekWord[] = [];
    let anyLearning = false;
    for (const i of chunk.g) {
      const word = verse.g[i] as GreekWord | undefined;
      if (!word) return null;
      const lemma = wordLemma(word).normalize('NFC');
      if (!lemma) return null;
      if (!solid.has(lemma)) {
        if (!learning?.has(lemma)) return null;
        anyLearning = true;
      }
      words.push(word);
    }
    return { words, learning: anyLearning };
  });
}
