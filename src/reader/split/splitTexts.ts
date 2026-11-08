// src/reader/split/splitTexts.ts — which texts a chapter can hold in the Reader's dock beside the passage (docs/design/reader-split.md 'Opening and closing', mw-5r3p30.1130), and how each is
// named, drawn and loaded. Pure but for the loader: the chooser (SplitChooser.tsx) and the dock (TextDock.tsx) read the table here, so the rows of the one are the names of the other.
//   - a New Testament chapter: Greek (the Byzantine text) and English (the Majority Standard Bible);
//   - an Old Testament chapter: Hebrew, English (the Berean Standard Bible), and where its Septuagint is shipped Septuagint · Greek (Swete's edition) and Septuagint · English (Brenton's translation).
// The texts are the chapter's own, whatever Settings > Old Testament in Greek says of the passage: the passage may be the Hebrew and the dock the Greek, or the other way.
import { isHebrewBook } from '../../data/books';
import type { SourceLanguage } from '../../data/chapter';
import type { ReaderView } from '../../data/repositories';

export type SplitTextKey = 'hebrew' | 'greek' | 'english' | 'lxx-greek' | 'lxx-english';

export const SPLIT_TEXT_KEYS: readonly SplitTextKey[] = ['hebrew', 'greek', 'english', 'lxx-greek', 'lxx-english'];

/** The text a kept value stands for, or null for an empty or a damaged value. */
export const splitTextOf = (value: string): SplitTextKey | null => SPLIT_TEXT_KEYS.find((key) => key === value) ?? null;

export interface SplitText {
  key: SplitTextKey;
  /** the row's name, and the dock's name at the left of its handle row */
  label: string;
  /** whose text it is, on the row's second line */
  whose: string;
}

const HEBREW: SplitText = { key: 'hebrew', label: 'Hebrew', whose: 'Westminster Leningrad Codex' };
const GREEK: SplitText = { key: 'greek', label: 'Greek', whose: 'the Byzantine text' };
const BSB: SplitText = { key: 'english', label: 'English', whose: 'Berean Standard Bible' };
const MSB: SplitText = { key: 'english', label: 'English', whose: 'Majority Standard Bible' };
const LXX_GREEK: SplitText = { key: 'lxx-greek', label: 'Septuagint · Greek', whose: "Swete's edition" };
const LXX_ENGLISH: SplitText = { key: 'lxx-english', label: 'Septuagint · English', whose: "Brenton's translation" };

/** The texts a chapter of `book` can be read beside, in the chooser's order; the Septuagint's two only where it is shipped for the chapter (`septuagint`). */
export function splitTextsFor(book: string, septuagint: boolean): SplitText[] {
  return isHebrewBook(book) ? [HEBREW, BSB, ...(septuagint ? [LXX_GREEK, LXX_ENGLISH] : [])] : [GREEK, MSB];
}

/** The text of `key` as the chooser names it for a chapter of `book`; undefined for a key the book has no such text for (Hebrew in Romans). */
export function splitTextNamed(book: string, key: SplitTextKey): SplitText | undefined {
  return splitTextsFor(book, true).find((text) => text.key === key);
}

/** Whether a text is the Septuagint's. */
export const isSeptuagintText = (key: SplitTextKey): boolean => key === 'lxx-greek' || key === 'lxx-english';

/** What the dock's rows are drawn in: the Reader's view (`greek` is the chapter's own words, Hebrew or Greek) and the language of those words. */
export function splitTextView(key: SplitTextKey, book: string): { view: ReaderView; source: SourceLanguage } {
  switch (key) {
    case 'hebrew':
      return { view: 'greek', source: 'hbo' };
    case 'greek':
    case 'lxx-greek':
      return { view: 'greek', source: 'grc' };
    case 'english':
      return { view: 'english', source: isHebrewBook(book) ? 'hbo' : 'grc' };
    case 'lxx-english':
      return { view: 'english', source: 'grc' };
  }
}

/** What a passage verse with no partner in the dock's text says at its place: 'Not in the Septuagint', 'Not in the Hebrew'. */
export const notInText = (key: SplitTextKey): string => (isSeptuagintText(key) ? 'Not in the Septuagint' : key === 'hebrew' ? 'Not in the Hebrew' : key === 'greek' ? 'Not in the Greek' : 'Not in the English');

/** What the dock's handle row says of a chapter its text does not exist for: 'No Septuagint for Romans'. `book` is the book's name as the Reader writes it. */
export const noTextFor = (key: SplitTextKey, book: string): string => `No ${isSeptuagintText(key) ? 'Septuagint' : key === 'hebrew' ? 'Hebrew' : key === 'greek' ? 'Greek' : 'English'} for ${book}`;
