// src/reader/septuagint.ts — what the Reader says of a Septuagint chapter (mw-u2w5klk.11, docs/data.md 'The Septuagint data'): the chapter is Swete's Greek with Brenton's English, one chunk a verse, in the Septuagint's
// own chapters and verses, which are not always Lampas's (Greek Ps 22:1 is Psalm 23:1). The Reader is opened on a Lampas chapter; its title, its verse numbers and its English under the Greek say both.
import type { Chapter, GreekWord, Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';

export { withoutGaps } from '../data/lxxChapter';

/** What the header says under the title of a Septuagint chapter: the Greek and the English, each with whose it is. */
export const SEPTUAGINT_SUBTITLE = "Greek: Swete's edition · English: Brenton's translation";

/** The title of the sheet a tap on that line opens (src/reader/SeptuagintSources.tsx); its text is SEPTUAGINT_SOURCES of src/tutor/credits.ts, the one place it is written. */
export const SEPTUAGINT_SHEET_TITLE = 'Whose texts these are';

/** The Greek of a Septuagint word as the Greek view draws it: as Swete printed it (`d`, with his brackets) while manuscript gaps are shown, else the bare `t`. */
export const gapText = (word: Pick<GreekWord, 't' | 'd'>, gaps: boolean | undefined): string => (gaps && word.d !== undefined ? word.d : word.t);

/** Whether a chapter is Swete's Septuagint (public/data-lxx): `edition` is 'swete' only there. */
export const isSeptuagint = (chapter: Pick<Chapter, 'edition'> | null | undefined): boolean => chapter?.edition === 'swete';

/** The title of a chapter opened as Lampas's chapter `title` ('Psalms 23'): with the Greek chapter's number beside it where that differs ('Psalms 23 (Greek 22)'). */
export const septuagintTitle = (title: string, lampas: number, chapter: Pick<Chapter, 'chapter' | 'edition'>): string =>
  isSeptuagint(chapter) && chapter.chapter !== lampas ? `${title} (Greek ${chapter.chapter})` : title;

/**
 * The number a Septuagint verse is shown with: Lampas's verse (its `ref`), and the Greek chapter and verse beside it where they differ ('1' and '22:1' of Greek Ps 22:1, which is Psalm 23:1).
 * A verse Lampas has no verse for ('none') shows its Greek number alone.
 */
export function septuagintNumber(verse: Pick<Verse, 'n' | 'ref'>, greekChapter: number): { shown: number; greek?: string } {
  const { ref } = verse;
  if (!ref || ref === 'none') return { shown: verse.n };
  return ref.chapter === greekChapter && ref.verse === verse.n ? { shown: ref.verse } : { shown: ref.verse, greek: `${greekChapter}:${verse.n}` };
}

/**
 * Whether a Septuagint chapter has English chunks aligned to its Greek words (scripts/lxx/align.ts, mw-u2w5klk.274.1): some chunk of some verse is the aligner's own pairing of English to Greek words (`y` 'align' with
 * a word in `g`). Such a chapter is woven as the New Testament's is. The chapter `data:build:lxx` writes, one chunk a verse holding every word, and a chapter the aligner paired nothing in, have nothing to weave.
 */
export const septuagintAligned = (chapter: Pick<Chapter, 'verses'> | null | undefined): boolean => chapter?.verses.some((v) => v.e.some((c) => c.y === 'align' && c.g.length > 0)) ?? false;

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
