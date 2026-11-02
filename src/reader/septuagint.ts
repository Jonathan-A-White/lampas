// src/reader/septuagint.ts — what the Reader says of a Septuagint chapter (mw-u2w5klk.11, docs/data.md 'The Septuagint data'): the chapter is Swete's Greek with Brenton's English, one chunk a verse, in the Septuagint's
// own chapters and verses, which are not always Lampas's (Greek Ps 22:1 is Psalm 23:1). The Reader is opened on a Lampas chapter; its title, its verse numbers and its English under the Greek say both.
import type { Chapter, Verse } from '../data/chapter';

/** What the header says under the title of a Septuagint chapter: the Greek and the English, each with whose it is. */
export const SEPTUAGINT_SUBTITLE = 'Septuagint (Swete) · Brenton (LXX2012)';

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

/** Brenton's English of a verse: its chunk (a verse has one; two or more are joined). '' when the verse has none. */
export const englishOfVerse = (verse: Pick<Verse, 'e'>): string => verse.e.map((c) => c.t.trim()).filter(Boolean).join(' ');
