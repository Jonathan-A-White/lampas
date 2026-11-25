// src/reader/septuagint.ts — what the Reader says of a Septuagint chapter (mw-u2w5klk.11, docs/data.md 'The Septuagint data'): the chapter is Swete's Greek with Brenton's English, one chunk a verse, in the Septuagint's
// own chapters and verses, which are not always Lampas's (Greek Ps 22:1 is Psalm 23:1). The Reader is opened on a Lampas chapter; its title, its verse numbers and its English under the Greek say both.
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';

import { withoutGaps } from '../data/lxxChapter';

export { withoutGaps };

/** What the header says under the title of a Septuagint chapter: the Greek and the English, each with whose it is. */
export const SEPTUAGINT_SUBTITLE = "Greek: Swete's edition · English: Brenton's translation";

/** The title of the sheet a tap on that line opens (src/reader/SeptuagintSources.tsx); its text is SEPTUAGINT_SOURCES of src/tutor/credits.ts, the one place it is written. */
export const SEPTUAGINT_SHEET_TITLE = 'Whose texts these are';

/** The Greek of a Septuagint word as the Greek view draws it: as Swete printed it (`d`, with his brackets) while manuscript gaps are shown, else the bare `t`. */
export const gapText = (word: Pick<GreekWord, 't' | 'd'>, gaps: boolean | undefined): string => (gaps && word.d !== undefined ? word.d : word.t);

/**
 * An English chunk's text as the English view draws it (mw-u2w5klk.331): Brenton brackets words the Greek lacks ('[And Jacob removed ... Gader,] and it came to pass'), and the brackets look like Swete's, so Settings >
 * Show manuscript gaps governs them too. `gaps` false (a Septuagint chapter, the setting Off) drops the bracket characters and keeps every word; true draws the text as printed; `undefined` is a text that is not the
 * Septuagint, which is never touched. Display only: the chunk keeps its `t`, which lookup, speech, copy and search read.
 */
export const chunkShown = (text: string, gaps: boolean | undefined): string => (gaps === false ? withoutGaps(text) : text);

/** The mark LXX2012 puts after Brenton's plural "ye" (its intro: "we have translated 'ye' as 'you^', like you-all, y'all"): the file carries U+2303 (⌃), the intro's own ASCII "^" is read the same. */
const YOU_MARK = /([\^\u2303])/u;

/** What a tap on that mark says (mw-u2w5klk.378), and the line the Septuagint's sources sheet carries beside it. */
export const SEPTUAGINT_YOU_TIP = "you^ = you, plural (Brenton's 'ye'). The 2012 spelling update marks it this way.";

/** The label of that line on the sources sheet (src/reader/SeptuagintSources.tsx). */
export const SEPTUAGINT_YOU_LABEL = 'The ^ after you';

/** A piece of a Septuagint English chunk: its text, or the plural mark (`mark` true) the reader gives a tip of its own. */
export type YouPiece = { text: string; mark: boolean };

/**
 * A Septuagint English chunk's text cut at the plural mark: 'you^, therefore' is 'you', the mark, ', therefore', so a tap on the mark and a tap on the word are different targets and the stop beside it stays
 * with the text. A mark with no word before it is not one (a stray caret stays text). Text with no mark is the one piece it was; the pieces joined are the text again.
 */
export function splitYouMarks(text: string): YouPiece[] {
  const parts = text.split(YOU_MARK);
  const out: YouPiece[] = [];
  parts.forEach((part, i) => {
    if (part === '') return;
    const isMark = i % 2 === 1;
    const before = out.length > 0 ? out[out.length - 1] : undefined;
    // a caret not right after a letter is plain text
    if (isMark && !(before && !before.mark && /\p{L}$/u.test(before.text))) {
      if (before && !before.mark) before.text += part;
      else out.push({ text: part, mark: false });
      return;
    }
    const prev = out[out.length - 1];
    if (!isMark && prev && !prev.mark) prev.text += part;
    else out.push({ text: part, mark: isMark });
  });
  return out;
}

/** Swete's marks at the edge of a word: his stops ('.' ',' ';' ':'), the high stop '·' (the Greek ano teleia too), the Greek question mark and his brackets. A koronis or an apostrophe (ἀπ᾽) is the word's own and stays. */
const SWETE_MARKS = /^[.,;:·\u0387\u037E()[\]]+|[.,;:·\u0387\u037E()[\]]+$/gu;

/** A Septuagint word as its card, Hear it and the tutor's questions have it: without Swete's punctuation and brackets ('γῆν.' -> 'γῆν'). The chapter keeps the printed `t`, which the Reader draws (mw-u2w5klk.17). */
export const withoutMarks = (text: string): string => text.replace(SWETE_MARKS, '') || text;

/** Whether a chapter is Swete's Septuagint (public/data-lxx): `edition` is 'swete' only there. */
export const isSeptuagint = (chapter: Pick<Chapter, 'edition'> | null | undefined): boolean => chapter?.edition === 'swete';

/** The form of a word to show, say or ask about: the clean form in a Septuagint chapter, the word's `t` as it is anywhere else. */
export const cardForm = (chapter: Pick<Chapter, 'edition'> | null | undefined, word: Pick<GreekWord, 't'>): string => (isSeptuagint(chapter) ? withoutMarks(word.t) : word.t);

/** The Greek chapter(s) a Septuagint chapter's verses are in: its own number, or where it joins two Greek chapters (Psalm 116 is Greek 114 and 115, Verse.greek) each of them. */
const greekChaptersOf = (chapter: Pick<Chapter, 'chapter' | 'verses'>): number[] => {
  const joined = [...new Set(chapter.verses.flatMap((v) => (v.greek ? [v.greek.chapter] : [])))];
  return joined.length > 0 ? joined : [chapter.chapter];
};

/** The title of a chapter opened as Lampas's chapter `title` ('Psalms 23'): with the Greek chapter's number beside it where that differs ('Psalms 23 (Greek 22)'; 'Psalms 116 (Greek 114 and 115)'). */
export const septuagintTitle = (title: string, lampas: number, chapter: Pick<Chapter, 'chapter' | 'edition'> & Partial<Pick<Chapter, 'verses'>>): string => {
  if (!isSeptuagint(chapter)) return title;
  const greek = greekChaptersOf({ chapter: chapter.chapter, verses: chapter.verses ?? [] });
  return greek.length === 1 && greek[0] === lampas ? title : `${title} (Greek ${greek.join(' and ')})`;
};

/**
 * The number a Septuagint verse is shown with: Lampas's verse (its `ref`), and the Greek chapter and verse beside it where they differ ('1' and '22:1' of Greek Ps 22:1, which is Psalm 23:1).
 * A verse Lampas has no verse for ('none') shows its Greek number alone. A verse of a chapter that joins two Greek chapters (Verse.greek) says its own Greek chapter.
 * A row that stands for several Greek verses (`through`, englishRows) reads as the range: '32-33', and the Greek '37:32-33' where that differs.
 */
export function septuagintNumber(verse: Pick<Verse, 'n' | 'ref' | 'greek' | 'through'>, greekChapter: number): { shown: number | string; greek?: string } {
  const one = (v: Pick<Verse, 'n' | 'ref' | 'greek'>): { shown: number; greek?: string } => {
    const { ref } = v;
    if (!ref || ref === 'none') return { shown: v.n };
    if (v.greek) return { shown: ref.verse, greek: `${v.greek.chapter}:${v.greek.verse}` };
    return ref.chapter === greekChapter && ref.verse === v.n ? { shown: ref.verse } : { shown: ref.verse, greek: `${greekChapter}:${v.n}` };
  };
  const first = one(verse);
  if (!verse.through) return first;
  const last = one(verse.through);
  const shown = last.shown === first.shown ? first.shown : `${first.shown}-${last.shown}`;
  if (first.greek === undefined && last.greek === undefined) return { shown };
  const a = first.greek ?? `${greekChapter}:${verse.n}`;
  const b = last.greek ?? `${greekChapter}:${verse.through.n}`;
  const [chapterA, verseA] = a.split(':');
  const [chapterB, verseB] = b.split(':');
  return { shown, greek: chapterA === chapterB ? `${chapterA}:${verseA}-${verseB}` : `${a}-${b}` };
}

/**
 * The rows the English view of a Septuagint chapter draws (mw-u2w5klk.307). Brenton's English for two Greek verses is one verse of his, kept at the first (scripts/data/lxxChapter.ts): the verse after it has no English
 * (Genesis 37:33, Psalm 149:9; Isaiah 38:15 has no Greek word either), so an English row of its own would be a number with nothing beside it. The pair is one row instead: the first verse with `to` and `through` the verse folded into it (as many as
 * follow it), `g` holding the Greek words of them all so the Greek is still there to read. The Greek view keeps every verse as it is. A verse with a heading, or the first of the chapter, stays its own row.
 * The array given is returned as it is when nothing folds.
 */
export function englishRows(verses: readonly Verse[]): Verse[] {
  const rows: Verse[] = [];
  let folded = false;
  for (const v of verses) {
    const prev = rows[rows.length - 1];
    if (prev && prev.e.length > 0 && v.e.length === 0 && !v.h && prev.greek?.chapter === v.greek?.chapter) {
      rows[rows.length - 1] = { ...prev, to: v.n, through: { n: v.n, ref: v.ref, greek: v.greek }, g: [...prev.g, ...v.g] };
      folded = true;
    } else rows.push(v);
  }
  return folded ? rows : (verses as Verse[]);
}

/** The verse number Lampas knows a verse of `chapter` by: a Septuagint verse's `ref` (Greek 9:22 is Psalm 10:1), else the verse's own `n` (every other chapter, and a verse with no Lampas verse). */
export const lampasNumber = (chapter: Pick<Chapter, 'edition'>, verse: Pick<Verse, 'n' | 'ref'>): number => (isSeptuagint(chapter) && verse.ref && verse.ref !== 'none' ? verse.ref.verse : verse.n);

/** The chapter Lampas knows a verse of `chapter` (held as chapter number `own`) by: a Septuagint verse's `ref` chapter (Greek 9:22 is Psalm 10:1, so chapter 10), else `own`. */
export const lampasChapter = (chapter: Pick<Chapter, 'edition'>, verse: Pick<Verse, 'ref'>, own: number): number => (isSeptuagint(chapter) && verse.ref && verse.ref !== 'none' ? verse.ref.chapter : own);

/**
 * The Lampas verses a view of Greek verses `n` to `to` (`to` absent: the verse alone) is of: the lowest and highest Lampas verse of the Greek verses in the range, as `{ n, to? }` (`to` only when they differ). A New Testament or Hebrew
 * unit is as it is. Greek verses Lampas has none for give their own numbers.
 */
export function lampasUnit(chapter: Pick<Chapter, 'edition' | 'verses'>, unit: Pick<Verse, 'n' | 'to'>): { n: number; to?: number } {
  if (!isSeptuagint(chapter)) return unit.to === undefined ? { n: unit.n } : { n: unit.n, to: unit.to };
  const held = chapter.verses.filter((v) => v.n >= unit.n && v.n <= (unit.to ?? unit.n) && v.ref && v.ref !== 'none');
  if (held.length === 0) return unit.to === undefined ? { n: unit.n } : { n: unit.n, to: unit.to };
  // a row englishRows folded holds the Lampas verses of the Greek verses folded into it too
  const numbers = held.flatMap((v) => [lampasNumber(chapter, v), ...(v.through?.ref && v.through.ref !== 'none' ? [lampasNumber(chapter, v.through)] : [])]);
  const from = Math.min(...numbers);
  const last = Math.max(...numbers);
  return last === from ? { n: from } : { n: from, to: last };
}

/**
 * Whether a Septuagint chapter has English chunks aligned to its Greek words (scripts/lxx/align.ts, mw-u2w5klk.274.1): some chunk of some verse is the aligner's own pairing of English to Greek words (`y` 'align' with
 * a word in `g`). Such a chapter is woven as the New Testament's is. The chapter `data:build:lxx` writes, one chunk a verse holding every word, and a chapter the aligner paired nothing in, have nothing to weave.
 */
export const septuagintAligned = (chapter: Pick<Chapter, 'verses'> | null | undefined): boolean => chapter?.verses.some((v) => v.e.some((c) => c.y === 'align' && c.g.length > 0)) ?? false;

/**
 * Whether an English chunk of a Septuagint verse is paired to the Greek words it renders (mw-u2w5klk.278): the aligner or the model pass paired it (`y` 'align' or 'model') and named a word in `g`. The chunk
 * `data:build:lxx` writes (one a verse, `g` holding every word of the verse, no `y`) and one the aligner could not pair (`g` empty) name no particular word, so a tap on its English has no word to open
 * and the Reader opens the verse instead of a wrong one.
 */
export const septuagintChunkLinked = (chunk: Pick<EnglishChunk, 'g' | 'y'>): boolean => (chunk.y === 'align' || chunk.y === 'model') && chunk.g.length > 0;

/** What the sheet of a tapped English chunk with no Greek word of its own says (mw-u2w5klk.349.67, the Governor's report: Genesis 1:1 'the' opened the Verse view). */
export const ENGLISH_ADDED = 'Added in English: the Greek has no word here';
export const ENGLISH_NOT_MATCHED = 'Not matched to its Greek word yet';

/** The Greek word a button of that sheet opens, and which side of the English chunk it stands on. */
export interface NearGreek {
  word: GreekWord;
  /** true when it is the word of the nearest chunk before this one (no chunk after it is paired) */
  before: boolean;
}

/**
 * What a tap on the English chunk `index` of a Septuagint verse is, when the chunk names no Greek word (septuagintChunkLinked is false): `added` when the aligner knows it has none (`g` empty: Brenton's 'the' of 'In the
 * beginning', which Swete's Ἐν ἀρχῇ has no word for), with `near`, the first Greek word of the next paired chunk (else the last of the nearest one before it); `unmatched` when the chunk is not paired yet (`data:build:lxx`'s
 * one chunk a verse, `g` holding every word), which has no nearer word to offer.
 */
export function englishOnlyOf(verse: Pick<Verse, 'e' | 'g'>, index: number): { kind: 'added' | 'unmatched'; near?: NearGreek } {
  const chunk = verse.e[index];
  if (chunk.g.length > 0) return { kind: 'unmatched' };
  const pick = (c: EnglishChunk | undefined, at: 'first' | 'last'): GreekWord | undefined => (c && septuagintChunkLinked(c) ? verse.g[c.g[at === 'first' ? 0 : c.g.length - 1]] : undefined);
  for (let i = index + 1; i < verse.e.length; i += 1) {
    const word = pick(verse.e[i], 'first');
    if (word) return { kind: 'added', near: { word, before: false } };
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    const word = pick(verse.e[i], 'last');
    if (word) return { kind: 'added', near: { word, before: true } };
  }
  return { kind: 'added' };
}

/**
 * The settings a Septuagint chapter is woven by (mw-u2w5klk.274.3): the reader's own where its verses carry aligned chunks (`weaveShown` follows them as for the New Testament), the Weave off where they do not.
 */
export const septuagintSettings = <T extends { weaveShown?: boolean }>(settings: T, aligned: boolean): T => (aligned || settings.weaveShown === false ? settings : { ...settings, weaveShown: false });

/**
 * The view a Septuagint chapter's verses are drawn in (mw-u2w5klk.275), by the switch's three positions as the New Testament's are: the Greek position is Swete's Greek alone, with no English under it;
 * the English position is Brenton's English as prose; the Weave position (the Weave on and plain English not chosen under it) of a chapter with aligned chunks (`aligned`, septuagintAligned) is the English view
 * with the Greek of his words woven in, as the New Testament's is; of a chapter with none it has no chunks to weave a Greek word over, so it draws the Greek verse alone, and the note says the Weave is off here.
 * `weaveShown` is useReaderSettings' (the Weave on and plain English not chosen under it).
 */
export const septuagintView = (view: ReaderView, weaveShown: boolean, aligned = false): ReaderView => (view === 'greek' || (weaveShown && !aligned) ? 'greek' : 'english');

/**
 * The view one verse is drawn and read in (mw-u2w5klk.274.7): the chapter's `view`, except that a verse with Greek words and no English chunk at all (Isaiah 40:7 has seven words and `e: []`) has nothing to
 * draw in the English view or in a Weave of it (a bare verse number, an empty Verse view, nothing to read aloud), so it falls back to its Greek alone, as the unaligned Weave draws the chapter.
 */
export const septuagintVerseView = (view: ReaderView, verse: Pick<Verse, 'e' | 'g'>): ReaderView => (view === 'english' && verse.e.length === 0 && verse.g.length > 0 ? 'greek' : view);

/** Whether the note that the Weave is off in a Septuagint chapter stands: in the Weave position only, which is the English view with the Weave shown, and only for a chapter with no aligned chunks. */
export const septuagintWeaveNoted = (view: ReaderView, weaveShown: boolean, aligned = false): boolean => view === 'english' && weaveShown && !aligned;

/** The layers of the derivation, in the words a reader is told (docs/lxx-derivation.md 'The layers'; Help's Words page). */
const LAYER_WORDS: Record<string, string> = {
  '1': "From the New Testament's forms",
  '2': 'From the paradigm parser',
  '2a': 'By agreement with its neighbours',
  '3': "A model's reading of the verse",
  g: 'A guess',
};

/** The derivation's confidence (0 to 1) in words: 0.85 and above is sure (layer 1, layer 2a), 0.6 and above likely (layer 2, a model's plain choice), the rest unsure (a model's `?`, a guess). */
export const confidenceWord = (confidence: number): 'sure' | 'likely' | 'unsure' => (confidence >= 0.85 ? 'sure' : confidence >= 0.6 ? 'likely' : 'unsure');

/** How Lampas read a word of the Septuagint: the layer in words, the confidence in words, and whether the card offers Report this reading (a guess, or a word it is unsure of). Undefined for a word the derivation did not read. */
export function readingOf(word: Pick<GreekWord, 'y' | 'c'>): { layer: string; confidence: 'sure' | 'likely' | 'unsure'; report: boolean } | undefined {
  const layer = word.y === undefined ? undefined : LAYER_WORDS[word.y];
  if (layer === undefined) return undefined;
  const confidence = confidenceWord(word.y === 'g' ? Math.min(word.c ?? 0, 0.49) : (word.c ?? 0));
  return { layer, confidence, report: confidence === 'unsure' };
}

/** What a Septuagint word's English line says (mw-u2w5klk.274.4): `text` is its own aligned Brenton chunk, or with `whole` the English of the whole verse, for a word no chunk is cut for. */
export interface WordEnglish {
  text: string;
  whole: boolean;
}

/**
 * The English of a Septuagint word as its sheet shows it, as the New Testament word shows its MSB chunk. The word's own chunk is one the aligner or the model pass paired to it (`y` 'align' or 'model', the word in `g`);
 * a word with no such chunk (a Greek article Brenton has no 'the' for) and a word of a chapter nothing was paired in (one unmarked chunk holds every word) give Brenton's whole verse, with `whole` set so the sheet says so.
 * Undefined for a word that is not one of the chapter's (the caller keeps the English it was given) and for a verse with no English.
 */
export function septuagintEnglish(chapter: Pick<Chapter, 'verses'>, word: GreekWord, verseOf?: number): WordEnglish | undefined {
  const verse = chapter.verses.find((v) => (verseOf === undefined || v.n === verseOf) && v.g.includes(word));
  if (!verse) return undefined;
  const chunk = word.e === undefined ? undefined : verse.e[word.e];
  if (chunk && (chunk.y === 'align' || chunk.y === 'model') && chunk.g.includes(verse.g.indexOf(word))) return { text: chunk.t, whole: false };
  const text = verse.e.map((c) => c.t).join(' ');
  return text === '' ? undefined : { text, whole: true };
}
