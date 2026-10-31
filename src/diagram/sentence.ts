// src/diagram/sentence.ts — the sentence a verse belongs to (mw-5r3p30.897). Diagram draws by sentence, not by verse: a verse that is the middle of a long sentence (Ephesians 1:5) gives the whole sentence
// (1:3-14), and a verse that holds the end of one sentence and the start of the next gives both. Pure: it reads the chapter and the table of sentence ends, nothing else.
// Where a sentence ends: Hebrew, a word carrying the sof pasuq (׃: the atnach is not an end); Greek, the places of src/diagram/sentenceEnds.ts (the app's Greek has no punctuation of its own, so the
// table is read from Robinson-Pierpont's: scripts/sentences-build.ts). A sentence never crosses a chapter. PROVISIONAL (the Governor's post of 2026-10-31).
import type { Chapter } from '../data/chapter';

/** The words of one verse that belong to a sentence: indexes into the verse's `g`, both inclusive. */
export interface SentencePart {
  verse: number;
  from: number;
  to: number;
}

/** A sentence: its parts in verse order, one for each verse it touches. */
export interface Sentence {
  parts: SentencePart[];
}

/** Where sentences end in a chapter: a verse number to the indexes (ascending) of the words that end one. */
export type SentenceEnds = ReadonlyMap<number, readonly number[]>;

/** The sentence-diagram grind takes at most this many words (grinds/sentence-diagram.input.schema.json). A sentence of more is cut at the end of the verse where it passes this. */
export const MAX_SENTENCE_WORDS = 300;

/** The sof pasuq, the Hebrew full stop. */
const SOF_PASUQ = '׃';

/** The table of the Greek ends, loaded when a diagram is first asked for (a chunk of its own). */
export const loadSentenceTable = (): Promise<Record<string, Record<number, string>>> => import('./sentenceEnds').then((m) => m.SENTENCE_ENDS);

/** A chapter's ends from the table's 'verse:word' places: '2:11 14:14' is word 11 of verse 2 and word 14 of verse 14. */
function endsFromTable(places: string | undefined): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const place of (places ?? '').split(' ')) {
    const [verse, word] = place.split(':').map(Number);
    if (!Number.isInteger(verse) || !Number.isInteger(word)) continue;
    out.set(verse, [...(out.get(verse) ?? []), word]);
  }
  return out;
}

/** Where sentences end in `chapter`: a Hebrew word with the sof pasuq; a Greek chapter in the table, its places; a chapter the table lacks (nothing is known), the end of every verse. */
export function sentenceEnds(chapter: Chapter, table: Record<string, Record<number, string>>): SentenceEnds {
  if (chapter.lang === 'hbo') {
    return new Map(chapter.verses.map((v) => [v.n, v.g.flatMap((w, i) => (w.t.includes(SOF_PASUQ) ? [i] : []))]));
  }
  const places = table[chapter.code]?.[chapter.chapter];
  if (places === undefined) return new Map(chapter.verses.map((v) => [v.n, [v.g.length - 1]]));
  return endsFromTable(places);
}

/** The sentences of the chapter in order, each a list of parts. A verse with no word is skipped. */
export function sentencesOf(chapter: Chapter, ends: SentenceEnds): Sentence[] {
  const sentences: Sentence[] = [];
  let open: SentencePart[] = [];
  let words = 0;
  const close = (): void => {
    if (open.length > 0) sentences.push({ parts: open });
    open = [];
    words = 0;
  };
  for (const verse of chapter.verses) {
    const last = verse.g.length - 1;
    if (last < 0) continue;
    // a sentence that has passed the grind's limit is cut where the verse before it ended
    if (words + verse.g.length > MAX_SENTENCE_WORDS && open.length > 0) close();
    let from = 0;
    for (const end of [...(ends.get(verse.n) ?? [])].filter((e) => e >= 0 && e <= last).sort((a, b) => a - b)) {
      open.push({ verse: verse.n, from, to: end });
      close();
      from = end + 1;
    }
    if (from <= last) {
      open.push({ verse: verse.n, from, to: last });
      words += last - from + 1;
    }
  }
  close();
  return sentences;
}

/** The sentences that have a word in verse `n`, in order: one for most verses, the whole long sentence for a verse in the middle of one, two or more for a verse with several ends. */
export function sentencesAt(chapter: Chapter, n: number, ends: SentenceEnds): Sentence[] {
  const found = sentencesOf(chapter, ends).filter((s) => s.parts.some((p) => p.verse === n));
  // a verse the ends did not reach (a chapter that lacks it) is its own sentence
  const verse = chapter.verses.find((v) => v.n === n);
  return found.length > 0 || !verse ? found : [{ parts: [{ verse: n, from: 0, to: Math.max(0, verse.g.length - 1) }] }];
}

/** Whether the sentence takes every word of each verse it touches, so it is named by its verses alone ('Ephesians 1:3-14'). */
export const isWholeVerses = (chapter: Chapter, sentence: Sentence): boolean =>
  sentence.parts.every((p) => p.from === 0 && p.to === (chapter.verses.find((v) => v.n === p.verse)?.g.length ?? 1) - 1);
