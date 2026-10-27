// src/data/studyLanguage.ts — which words and which chapter the Quick test, Review and the Parsing drill draw from, now that a word is Greek or Hebrew (mw-gdcyf98.19).
// The words in play follow the languages he chose (Settings, 'Which languages?'): Greek words unless he chose Hebrew alone, Hebrew words when he chose Hebrew or both. The language a
// drill reads its chapter in is languageInHand's: the open chapter's when he chose it, else the one language he chose, else the Greek | Hebrew segment. Review asks the segment's words
// where both are chosen. Pure but for the reads of the languages and the open chapter.
import { isHebrewBook } from './books';
import type { SourceLanguage } from './chapter';
import type { Word } from './db';
import { languageInHand } from './grammar/languageInHand';
import { getOpenChapter } from './readerChapter';
import { getLanguages } from './repositories';
import type { Languages } from '../settings/definitions/interest';
import { readSourceSegment } from '../ui/sourceSegmentStore';

/** The language a word is in: a word stored before Hebrew has none and is Greek. */
export const languageOfWord = (word: Pick<Word, 'lang'>): SourceLanguage => word.lang ?? 'grc';

/** The languages whose words are asked when he has chosen `languages`: with both chosen and a `segment`, that one alone. */
export function languagesInPlay(languages: Languages, segment?: SourceLanguage): SourceLanguage[] {
  if (languages === 'hebrew') return ['hbo'];
  if (languages === 'both') return segment ? [segment] : ['grc', 'hbo'];
  return ['grc'];
}

/** The words of `words` that are in play (see languagesInPlay). */
export const wordsInPlay = <T extends Pick<Word, 'lang'>>(words: readonly T[], languages: Languages, segment?: SourceLanguage): T[] => {
  const play = languagesInPlay(languages, segment);
  return words.filter((w) => play.includes(languageOfWord(w)));
};

/** The languages Review asks words in now: those he chose, the segment's alone where both are. */
export async function reviewLanguages(): Promise<SourceLanguage[]> {
  return languagesInPlay(await getLanguages(), readSourceSegment());
}

/** The language a drill reads in, from what he chose, the open chapter and the segment: Greek where no ladder is in hand (English only). */
export const drillLanguage = (languages: Languages, open: SourceLanguage, segment: SourceLanguage): SourceLanguage => languageInHand({ chapter: open, languages, segment }) ?? 'grc';

/** The language the Parsing drill reads in now. */
export async function studyLanguage(): Promise<SourceLanguage> {
  return drillLanguage(await getLanguages(), isHebrewBook(getOpenChapter().book) ? 'hbo' : 'grc', readSourceSegment());
}
