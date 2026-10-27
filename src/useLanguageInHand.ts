// src/useLanguageInHand.ts — the ladder the Goal, Placement and the idea sheet draw now (mw-gdcyf98.10): languageInHand over the languages he chose (live) and the
// Greek | Hebrew segment; `chapter` is the language of a chapter the screen has open, none on the Goal and Placement screens.
import { useLiveQuery } from 'dexie-react-hooks';
import { languageInHand, ladderLangsOf } from './data/grammar/languageInHand';
import type { LadderLang } from './data/grammar/ladders';
import { getLanguages } from './data/repositories';
import { useSourceSegment } from './ui/sourceSegmentStore';

export interface LanguageInHand {
  /** the ladder in hand; null at English only, and undefined until the languages are read */
  lang: LadderLang | null | undefined;
  /** both ladders are chosen: the screen draws the Greek | Hebrew segment */
  both: boolean;
}

export function useLanguageInHand(chapter?: LadderLang): LanguageInHand {
  const languages = useLiveQuery(getLanguages, []);
  const segment = useSourceSegment();
  if (languages === undefined) return { lang: undefined, both: false };
  return { lang: languageInHand({ chapter, languages, segment }), both: ladderLangsOf(languages).length === 2 };
}
