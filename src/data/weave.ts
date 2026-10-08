// src/data/weave.ts — the diglot weave: which English chunks of a verse are shown as their Greek instead.
import { type GreekWord, type Verse, wordLemma } from './chapter';

/** The Greek words to show in place of English chunk `i` (in the chunk's own order), or null when it stays English. */
export type Woven = GreekWord[] | null;

/**
 * Weaves one verse: a chunk is woven only when it has Greek words, none of its Greek positions is missing, it is
 * not a '-' or a chunk with supplied words, and every one of its Greek words has a lemma in `solid`. A chunk that
 * cannot be read is left English on its own; it never changes its neighbours.
 */
export function weaveVerse(verse: Verse, solid: ReadonlySet<string>): Woven[] {
  return verse.e.map((chunk) => {
    if (chunk.s || chunk.t.trim() === '-' || chunk.g.length === 0) return null;
    const words: GreekWord[] = [];
    for (const i of chunk.g) {
      const word = verse.g[i] as GreekWord | undefined;
      if (!word) return null;
      const lemma = wordLemma(word).normalize('NFC');
      if (!lemma || !solid.has(lemma)) return null;
      words.push(word);
    }
    return words;
  });
}
