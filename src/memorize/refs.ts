// src/memorize/refs.ts — the verses a canonical reference ('Rom.8.28', 'Rom.8.28-29', 'Jonah.1.10', 'Ps.62.1-2') names, as Memorize learns them (docs/layout/memorize.md).
import { loadChapter, type Chapter, type Verse } from '../data/chapter';
import { listedOf } from '../lists/canonical';
import { passageOf } from '../lists/passageOf';

/** A reference to any book of the Bible: its verses, each its own Verse of `source` (never a passage Verse, whose chunk indexes point elsewhere). An Old Testament chapter's verses are
 *  English ones over Hebrew words (`source.lang` 'hbo'): they are learned in English only. */
export interface Verses {
  book: string;
  chapter: number;
  verses: Verse[];
  /** 'Romans 8:28-29'; a chapter alone is its first verse, 'Romans 8:1', as the passage player holds it */
  heading: string;
  /** the chapter the verses are of: the weave is made over the whole chapter (src/reader/useWoven.ts wovenOf) */
  source: Chapter;
}

/**
 * The verses a canonical reference of any book names, or null for a string that names no verse (not a reference, a book,
 * chapter or verse that is not there). A chapter alone is its first verse, as the passage player reads it; a range keeps the verses of it the chapter has.
 */
export async function versesOf(canonical: string): Promise<Verses | null> {
  const listed = listedOf(canonical);
  // listedOf reads a verse 0 as the chapter alone; here it names no verse
  if (!listed || (listed.verse === undefined && canonical.split('.').length > 2)) return null;
  const { heading, held } = passageOf(listed);
  const source = await loadChapter(held.book, held.chapter);
  const verses = source.verses.filter((v) => v.n >= held.first && v.n <= held.last);
  if (verses.length === 0) return null;
  return { book: held.book, chapter: held.chapter, verses, heading, source };
}
