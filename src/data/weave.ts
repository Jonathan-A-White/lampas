// src/data/weave.ts — the diglot weave: which English chunks of a verse are shown as their Greek instead.
import type { WeaveOrder } from '../settings/definitions/weaveOrder';
import { type Chapter, type GreekWord, ownEnglish, type Verse, wordLemma } from './chapter';
import { holdsLemma, lemmaKeyOf } from './lemma';
import { cardForm } from '../reader/septuagint';

/** The Greek words to show in place of English chunk `i` (in the chunk's own order), or null when it stays English.
 * `learning` is true when at least one of them is a word he is still learning: the Reader sets the chunk's English
 * in small grey beneath the Greek until the word turns solid. */
export type Woven = { words: GreekWord[]; learning: boolean } | null;

/** A verse's weave, chunk by chunk in `verse.e`'s own indexes, and the order the chunks are drawn and read in (mw-5r3p30.250): absent, the
 * English order. */
export type WovenVerse = Woven[] & {
  readonly order?: readonly number[];
  readonly texts?: readonly string[];
  readonly word?: (word: GreekWord) => 'solid' | 'learning' | null;
  /** per chunk, the Greek words he knows that the chunk stands for while the chunk itself stays English (mw-5r3p30.878); see besideVerse */
  readonly beside?: readonly (readonly GreekWord[] | undefined)[];
  /** per chunk, true when an English word added by design is not drawn because the chunks drawn on either side of it are woven (mw-u2w5klk.349.69); see goneVerse */
  readonly gone?: readonly boolean[];
  /** the Greek words of a Septuagint verse he knows that no chunk holds, as indexes into `verse.g` (mw-u2w5klk.349.124); see unheldVerse and drawnPieces */
  readonly unheld?: ReadonlySet<number>;
};

/** The lemmas the weave knows (NFC): the solid ones, and with Weave 'Solid and learning words' the learning ones too. */
export interface WeaveLemmas {
  solid: ReadonlySet<string>;
  learning?: ReadonlySet<string>;
  /** The grammar dial: false for a word whose form's grammar is not at the level asked (src/data/grammar/formLevel.ts). Absent: every form passes. */
  formPasses?: (word: GreekWord) => boolean;
}

/** Whether one Greek word stands in Greek in the weave: 'solid' or 'learning' by its lemma, null when it stays English (its lemma unknown to him, or its form not at the grammar level asked). weaveVerse's rule
 * for a word, which a variant chip follows word by word (mw-9ji6ek0.37). */
export function weaveWord(word: GreekWord, { solid, learning, formPasses }: WeaveLemmas): 'solid' | 'learning' | null {
  const lemma = wordLemma(word).normalize('NFC');
  if (!lemma || (formPasses && !formPasses(word))) return null;
  // a Septuagint lemma written as a list ('ὕδωρ, ὕδατος') is the word of its headword, which is what he keeps (mw-u2w5klk.327)
  return holdsLemma(solid, lemma) ? 'solid' : learning && holdsLemma(learning, lemma) ? 'learning' : null;
}

/** The weave `woven` knows the rule it was made by: `word` says of a Greek word whether the weave would show it in Greek (a variant chip's words are not in the verse's chunks). It is not an element of the weave. */
export const withWordRule = <T extends Woven[]>(woven: T, lemmas: WeaveLemmas): T & Pick<WovenVerse, 'word'> =>
  Object.defineProperty(woven, 'word', { value: (word: GreekWord) => weaveWord(word, lemmas), enumerable: false, configurable: true }) as T & Pick<WovenVerse, 'word'>;

/**
 * Weaves one verse: a chunk is woven only when it has Greek words, none of its Greek positions is missing, it is
 * not a '-' or a chunk with supplied words (unless it is one Greek word with English of its own, mw-5r3p30.947), and every one of its Greek words has a lemma in `solid` or `learning`.
 * A chunk with any word whose form `formPasses` refuses stays English whole, never half a chunk.
 * A chunk with any learning word is marked `learning`. A chunk that cannot be read is left English on its own; it
 * never changes its neighbours.
 */
export function weaveVerse(verse: Verse, { solid, learning, formPasses }: WeaveLemmas): Woven[] {
  return verse.e.map((chunk) => {
    // a chunk of one Greek word with English of its own is that word's even when the translators supplied words in it ('[the] beginning,'); a chunk of supplied words only ('While') stays English (mw-5r3p30.947)
    if ((chunk.s && !(chunk.g.length === 1 && ownEnglish(chunk))) || chunk.t.trim() === '-' || chunk.g.length === 0) return null;
    const words: GreekWord[] = [];
    let anyLearning = false;
    for (const i of chunk.g) {
      const word = verse.g[i] as GreekWord | undefined;
      if (!word) return null;
      const how = weaveWord(word, { solid, learning, formPasses });
      if (!how) return null;
      if (how === 'learning') anyLearning = true;
      words.push(word);
    }
    return { words, learning: anyLearning };
  });
}

/**
 * The known Greek words that an English chunk still hides (mw-5r3p30.878), chunk by chunk in `verse.e`'s own indexes: a chunk the weave leaves English (`woven[i]` is null) because
 * another word it stands for is not known yet, or because it is made of supplied words ('While' of Acts 18:12, no English of its own) or holds more than one Greek word, shows each Greek word of it he does know, in gold, beside its
 * English; the English goes (the chunk is woven) once every Greek word it stands for is known. A chunk with no known word, a '-' and a chunk with no Greek have none (undefined).
 */
export function besideVerse(verse: Verse, woven: readonly Woven[], lemmas: WeaveLemmas): (GreekWord[] | undefined)[] {
  return verse.e.map((chunk, i) => {
    if (woven[i] || chunk.t.trim() === '-') return undefined;
    const words = chunk.g.map((g) => verse.g[g] as GreekWord | undefined).filter((w): w is GreekWord => w !== undefined && weaveWord(w, lemmas) !== null);
    return words.length ? words : undefined;
  });
}

/** The weave `woven` of `verse` knows the Greek words known beside its English chunks (besideVerse). It is not an element of the weave. */
export const withBeside = <T extends Woven[]>(woven: T, verse: Verse, lemmas: WeaveLemmas): T & Pick<WovenVerse, 'beside'> =>
  Object.defineProperty(woven, 'beside', { value: besideVerse(verse, woven, lemmas), enumerable: false, configurable: true }) as T & Pick<WovenVerse, 'beside'>;

/**
 * The Greek words of a verse that he knows (weaveWord) and no English chunk holds, as indexes into `verse.g` (mw-u2w5klk.349.124, the Governor: every Greek word shows in every weave and order). Brenton gives such a word no English of its own, or the pairing gave it none ('ἐν' of
 * Deuteronomy 1:22), so no chunk would ever draw it: it is drawn in Greek in its own place (drawnPieces). For the Septuagint only (src/reader/useWoven.ts wovenOf; weaveForTeaching).
 */
export function unheldVerse(verse: Verse, lemmas: WeaveLemmas): Set<number> {
  const held = new Set(verse.e.flatMap((chunk) => chunk.g));
  return new Set(verse.g.flatMap((word, i) => (!held.has(i) && weaveWord(word, lemmas) !== null ? [i] : [])));
}

/** The weave `woven` of `verse` knows the Greek words it draws that no chunk holds (unheldVerse). It is not an element of the weave. */
export const withUnheld = <T extends Woven[]>(woven: T, verse: Verse, lemmas: WeaveLemmas): T & Pick<WovenVerse, 'unheld'> =>
  Object.defineProperty(woven, 'unheld', { value: unheldVerse(verse, lemmas), enumerable: false, configurable: true }) as T & Pick<WovenVerse, 'unheld'>;

/**
 * Whether the Septuagint chunk `i`, which the pairing has not reached (`y` 'align?', no Greek word), may be the English of a Greek word that no chunk holds (mw-u2w5klk.349.108: 'fullness thereof;' of Psalm 23:1, the only English
 * of πλήρωμα αὐτῆς): any such word but an article, wherever it stands, for Brenton's order is not always Swete's; or an article that stands between the Greek of the nearest chunks with Greek on either side of it in the English
 * ('that' of οἱ κατοικοῦντες). An article elsewhere with no English is carried by its noun's ('God' for ὁ θεός), so the 'the' of 'In the beginning' is still an added word.
 */
function awaitsGreek(verse: Verse, i: number): boolean {
  const held = new Set(verse.e.flatMap((chunk) => chunk.g));
  const hasGreek = (chunk: Verse['e'][number]): boolean => chunk.g.length > 0;
  const before = verse.e.slice(0, i).reverse().find(hasGreek);
  const after = verse.e.slice(i + 1).find(hasGreek);
  const ends = [before ? Math.max(...before.g) : -1, after ? Math.min(...after.g) : verse.g.length];
  return verse.g.some((word, k) => !held.has(k) && (!word.p.startsWith('T-') || (k > Math.min(...ends) && k < Math.max(...ends))));
}

/**
 * The English words added by design that fall away (mw-u2w5klk.349.69, the Governor: they go once the words on both sides are in Greek), chunk by chunk in `verse.e`'s own indexes. A chunk is English by design when it has no
 * Greek of its own (`g` empty, not a '-'), or, outside the Septuagint, when its English is supplied words only ('While' of Acts 18:12): the Greek is not there to be shown in its place. It is gone when the nearest chunk on each side of it, in the order
 * the weave draws them (`woven.order`, else the English order), that is not itself English by design is woven; at a verse's start or end the one neighbour decides, and a verse with none has no word to fall away
 * after. A chunk English for any other reason (its Greek not known yet, a Septuagint chunk not paired yet, a '-') is a neighbour that is not woven, so the word beside it stays; so does a design-English chunk that has a known
 * Greek word drawn in gold beside it (besideVerse), for that word would go with it.
 * No Greek word is lost with a chunk of the Septuagint (a chunk with `y`, mw-u2w5klk.349.108): one that holds Greek words is their only English, and one the pairing has not reached that may be a Greek word's English
 * (awaitsGreek) is waiting for that word, not added.
 */
export function goneVerse(verse: Verse, woven: WovenVerse): boolean[] {
  const order = drawnOrder(verse, woven);
  const design = (i: number): boolean => {
    const chunk = verse.e[i];
    if (woven[i] || chunk.t.trim() === '-' || woven.beside?.[i]) return false;
    if (chunk.g.length === 0) return chunk.y !== 'align?' || !awaitsGreek(verse, i);
    return chunk.y === undefined && chunk.s !== undefined && ownEnglish(chunk) === '';
  };
  const gone = verse.e.map(() => false);
  order.forEach((i, p) => {
    if (!design(i)) return;
    const near = (step: 1 | -1): number | undefined => {
      for (let q = p + step; q >= 0 && q < order.length; q += step) if (!design(order[q])) return order[q];
      return undefined;
    };
    const sides = [near(-1), near(1)].filter((j): j is number => j !== undefined);
    gone[i] = sides.length > 0 && sides.every((j) => woven[j] !== null);
  });
  return gone;
}

/** The weave `woven` of `verse` knows which of its added English words fall away (goneVerse); call it after withBeside. It is not an element of the weave. */
export const withGone = <T extends WovenVerse>(woven: T, verse: Verse): T =>
  Object.defineProperty(woven, 'gone', { value: goneVerse(verse, woven), enumerable: false, configurable: true });

/** Whether chunk `i` is an added English word the weave does not draw (goneVerse). */
export const goneOf = (woven: WovenVerse | null | undefined, i: number): boolean => woven?.gone?.[i] === true;

/** The Greek words drawn in gold before the English of chunk `i` (besideVerse); none when the chunk is woven or knows none. */
export const besideOf = (woven: WovenVerse | null | undefined, i: number): readonly GreekWord[] => woven?.beside?.[i] ?? [];

/**
 * The verse as the teach sheet shows it (mw-bsf54t.4): woven with his solid words in Greek and the new word `lemma` (NFC) in Greek as well,
 * marked `learning` so its English stands small beneath it. A chunk that has the new word is shown in Greek even when weaveVerse leaves
 * it English (a chunk of supplied words, or one with another word he does not know yet), for the point of the sheet is to see the word
 * in the verse; a chunk with no Greek at all, or only '-', stays English.
 */
export function weaveForTeaching(verse: Verse, solid: ReadonlySet<string>, lemma: string, septuagint = false): WovenVerse {
  const lemmas: WeaveLemmas = { solid, learning: new Set([lemma]) };
  const woven = weaveVerse(verse, lemmas);
  const shown = verse.e.map((chunk, i) => {
    if (woven[i]?.learning || chunk.t.trim() === '-') return woven[i];
    const words = chunk.g.map((g) => verse.g[g] as GreekWord | undefined).filter((w): w is GreekWord => w !== undefined);
    return words.some((w) => holdsLemma(new Set([lemma]), wordLemma(w))) ? { words, learning: true } : woven[i];
  });
  // in the Septuagint the words no chunk holds are drawn too, the new one among them (mw-u2w5klk.349.124)
  return septuagint ? withUnheld(shown, verse, lemmas) : shown;
}

/** The forms of the new word `lemma` in `verse`, as the teach sheet lists them under 'In this verse': cardForm's, so a Septuagint word has no mark of Swete's. */
export const teachForms = (verse: Verse, lemma: string, chapter: Pick<Chapter, 'edition'>): string[] => verse.g.filter((w) => lemmaKeyOf(w.l) === lemma).map((w) => cardForm(chapter, w));

/**
 * The order the chunks of a verse are laid out in (mw-5r3p30.250), as indexes into `verse.e`. English: the MSB's English order, 0, 1, 2 ...
 * Greek: the table's Greek order, each chunk standing once, where its first Greek word stands (a chunk that renders words 2 and 5 stands at 2);
 * a chunk with no Greek of its own stays behind the chunk before it in the English (or first, when none is). A Greek word with no English
 * is in no chunk, so this order does not hold it: drawnPieces adds the ones the weave draws (the Septuagint's known ones, and a card's marked one).
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

/** Where a Greek word that no English chunk renders is drawn in a verse's English or weave (mw-5r3p30.817, mw-u2w5klk.349.124): `before` maps a chunk index to the words drawn just before
 * that chunk, `end` holds those drawn after the last chunk. */
export interface StrayMarks {
  before: ReadonlyMap<number, readonly number[]>;
  end: readonly number[];
}

/**
 * A word the MSB gives no English of its own ('ὃ' of 'ὃ ἠδίκησεν', 'his wrong,') is in no chunk, so an English or woven verse never drew it, and a card that marks it
 * (a Review question's verse) showed nothing marked; the Septuagint Weave draws every such word he knows (unheldVerse). `strayMarks` places each of the `marked` Greek indexes that no chunk holds beside its neighbours: before the chunk
 * that holds the next Greek word after it, or at the end of the drawn chunk that holds the word before it when none follows; a verse none of whose words has a chunk draws them
 * all at the start. `order` is the drawn order (drawnOrder).
 */
export function strayMarks(verse: Verse, marked: ReadonlySet<number>, order: readonly number[]): StrayMarks {
  const held = new Map<number, number>();
  verse.e.forEach((chunk, i) => chunk.g.forEach((g) => held.set(g, i)));
  const before = new Map<number, number[]>();
  const end: number[] = [];
  const put = (chunk: number | undefined, word: number): void => {
    if (chunk === undefined) end.push(word);
    else before.set(chunk, [...(before.get(chunk) ?? []), word]);
  };
  for (const word of [...marked].filter((i) => !held.has(i) && verse.g[i] !== undefined).sort((a, b) => a - b)) {
    const next = [...held.keys()].filter((g) => g > word).sort((a, b) => a - b)[0];
    if (next !== undefined) {
      put(held.get(next), word);
      continue;
    }
    const last = [...held.keys()].filter((g) => g < word).sort((a, b) => b - a)[0];
    if (last === undefined) put(order[0], word);
    else put(order[order.indexOf(held.get(last) as number) + 1], word);
  }
  return { before, end };
}

/** The chunk indexes of `verse` in the order a weave lays them out. */
export const drawnOrder = (verse: Verse, woven: WovenVerse | null): readonly number[] => woven?.order ?? verse.e.map((_, i) => i);

/** Where `verse`'s Greek words that no chunk holds are drawn (strayMarks in the weave's order): the ones the weave draws (WovenVerse.unheld) and the ones a card marks. */
export const straysOf = (verse: Verse, woven: WovenVerse | null, marked?: ReadonlySet<number>): StrayMarks =>
  strayMarks(verse, new Set([...(woven?.unheld ?? []), ...(marked ?? [])]), drawnOrder(verse, woven));

/** One thing a weave draws: an English chunk (woven or not) by its index in `verse.e`, or a Greek word no chunk holds by its index in `verse.g`. */
export type DrawnPiece = { chunk: number } | { word: number };

/** What the weave of `verse` draws, in order: the chunks of drawnOrder, each Greek word no chunk holds (WovenVerse.unheld) where straysOf places it. Every reader of a weave's text walks this, not drawnOrder. */
export function drawnPieces(verse: Verse, woven: WovenVerse | null): DrawnPiece[] {
  const { before, end } = straysOf(verse, woven);
  const word = (w: number): DrawnPiece => ({ word: w });
  return [...drawnOrder(verse, woven).flatMap((chunk): DrawnPiece[] => [...(before.get(chunk) ?? []).map(word), { chunk }]), ...end.map(word)];
}

/** The English of chunk `i` as the weave shows it. */
export const chunkText = (verse: Verse, woven: WovenVerse | null | undefined, i: number): string => woven?.texts?.[i] ?? verse.e[i].t;
