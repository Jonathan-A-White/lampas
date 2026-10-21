// src/data/weave.ts — the diglot weave: which English chunks of a verse are shown as their Greek instead.
import type { WeaveOrder } from '../settings/definitions/weaveOrder';
import { type GreekWord, type Verse, wordLemma } from './chapter';

/** The Greek words to show in place of English chunk `i` (in the chunk's own order), or null when it stays English.
 * `learning` is true when at least one of them is a word he is still learning: the Reader sets the chunk's English
 * in small grey beneath the Greek until the word turns solid. */
export type Woven = { words: GreekWord[]; learning: boolean } | null;

/** A verse's weave, chunk by chunk in `verse.e`'s own indexes, and the order the chunks are drawn and read in (mw-5r3p30.250): absent, the
 * English order. */
export type WovenVerse = Woven[] & { readonly order?: readonly number[]; readonly texts?: readonly string[] };

/** The lemmas the weave knows (NFC): the solid ones, and with Weave 'Solid and learning words' the learning ones too. */
export interface WeaveLemmas {
  solid: ReadonlySet<string>;
  learning?: ReadonlySet<string>;
  /** The grammar dial: false for a word whose form's grammar is not at the level asked (src/data/grammar/formLevel.ts). Absent: every form passes. */
  formPasses?: (word: GreekWord) => boolean;
}

/**
 * Weaves one verse: a chunk is woven only when it has Greek words, none of its Greek positions is missing, it is
 * not a '-' or a chunk with supplied words, and every one of its Greek words has a lemma in `solid` or `learning`.
 * A chunk with any word whose form `formPasses` refuses stays English whole, never half a chunk.
 * A chunk with any learning word is marked `learning`. A chunk that cannot be read is left English on its own; it
 * never changes its neighbours.
 */
export function weaveVerse(verse: Verse, { solid, learning, formPasses }: WeaveLemmas): Woven[] {
  return verse.e.map((chunk) => {
    if (chunk.s || chunk.t.trim() === '-' || chunk.g.length === 0) return null;
    const words: GreekWord[] = [];
    let anyLearning = false;
    for (const i of chunk.g) {
      const word = verse.g[i] as GreekWord | undefined;
      if (!word) return null;
      const lemma = wordLemma(word).normalize('NFC');
      if (!lemma) return null;
      if (formPasses && !formPasses(word)) return null;
      if (!solid.has(lemma)) {
        if (!learning?.has(lemma)) return null;
        anyLearning = true;
      }
      words.push(word);
    }
    return { words, learning: anyLearning };
  });
}

/**
 * The verse as the teach sheet shows it (mw-bsf54t.4): woven with his solid words in Greek and the new word `lemma` (NFC) in Greek as well,
 * marked `learning` so its English stands small beneath it. A chunk that has the new word is shown in Greek even when weaveVerse leaves
 * it English (a chunk of supplied words, or one with another word he does not know yet), for the point of the sheet is to see the word
 * in the verse; a chunk with no Greek at all, or only '-', stays English.
 */
export function weaveForTeaching(verse: Verse, solid: ReadonlySet<string>, lemma: string): Woven[] {
  const woven = weaveVerse(verse, { solid, learning: new Set([lemma]) });
  return verse.e.map((chunk, i) => {
    if (woven[i]?.learning || chunk.t.trim() === '-') return woven[i];
    const words = chunk.g.map((g) => verse.g[g] as GreekWord | undefined).filter((w): w is GreekWord => w !== undefined);
    return words.some((w) => wordLemma(w).normalize('NFC') === lemma) ? { words, learning: true } : woven[i];
  });
}

/**
 * The order the chunks of a verse are laid out in (mw-5r3p30.250), as indexes into `verse.e`. English: the MSB's English order, 0, 1, 2 ...
 * Greek: the table's Greek order, each chunk standing once, where its first Greek word stands (a chunk that renders words 2 and 5 stands at 2);
 * a chunk with no Greek of its own stays behind the chunk before it in the English (or first, when none is). A Greek word the MSB gives no
 * English is in no chunk, so it is not drawn, in either order.
 */
export function chunkOrder(verse: Verse, order: WeaveOrder): number[] {
  const english = verse.e.map((_, i) => i);
  if (order === 'english') return english;
  let place = -1;
  const at = verse.e.map((chunk) => {
    if (chunk.g.length) place = Math.min(...chunk.g);
    return place;
  });
  return english.sort((a, b) => at[a] - at[b] || a - b);
}

/** A sentence's closing mark at the end of a chunk's English: the mark, then any closing quote or bracket. */
const CLOSING = /([.?!;:]+)([”’"')\]]*)$/;

/**
 * The English of every chunk as a Greek-order weave shows it (mw-5r3p30.698), or undefined when it is the chunks' own text. A sentence's closing mark
 * belongs to the end of the sentence: the English sentences are those the marks close, and when the chunks are laid out in `order` a mark on a chunk
 * that is followed by more of its own sentence is taken off it and put on the sentence's last drawn chunk (in place of a comma that chunk ended with),
 * so 'are seared with a hot iron.' drawn before 'whose consciences' gives '... iron whose consciences.'. A sentence the English never closed stays open.
 */
function movedMarks(verse: Verse, order: readonly number[]): string[] | undefined {
  let sentence = 0;
  const of = verse.e.map((c) => {
    const s = sentence;
    if (CLOSING.test(c.t.trimEnd())) sentence += 1;
    return s;
  });
  const texts = verse.e.map((c) => c.t);
  order.forEach((i, p) => {
    const closing = CLOSING.exec(verse.e[i].t.trimEnd());
    if (!closing || !order.slice(p + 1).some((j) => of[j] === of[i])) return;
    const last = order.filter((j) => of[j] === of[i]).pop() as number;
    texts[i] = verse.e[i].t.trimEnd().replace(CLOSING, '');
    texts[last] = `${texts[last].trimEnd().replace(/,$/, '')}${closing[0]}`;
  });
  return texts.some((t, i) => t !== verse.e[i].t) ? texts : undefined;
}

/** The weave `woven` of `verse` with the order it is laid out in: Greek carries chunkOrder's (and, where a sentence's closing mark had to move, the chunks' texts), English none (the chunks' own order). */
export function wovenInOrder(verse: Verse, woven: Woven[], order: WeaveOrder): WovenVerse {
  if (order !== 'greek') return woven;
  const drawn = chunkOrder(verse, order);
  const texts = movedMarks(verse, drawn);
  return Object.assign([...woven], { order: drawn, ...(texts ? { texts } : {}) });
}

/** The chunk indexes of `verse` in the order a weave lays them out. */
export const drawnOrder = (verse: Verse, woven: WovenVerse | null): readonly number[] => woven?.order ?? verse.e.map((_, i) => i);

/** The English of chunk `i` as the weave shows it. */
export const chunkText = (verse: Verse, woven: WovenVerse | null | undefined, i: number): string => woven?.texts?.[i] ?? verse.e[i].t;
