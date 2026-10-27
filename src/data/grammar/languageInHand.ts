// src/data/grammar/languageInHand.ts — which ladder the Goal, Placement, Drill it and the idea sheet draw (mw-gdcyf98.10, PROVISIONAL): the language of the chapter where
// a chapter is open, else the one language he chose, else, with both chosen, the language of the Greek | Hebrew segment (src/ui/SourceSegment.tsx). At English only no ladder
// is in hand. Pure: the screens read the chapter, the languages and the segment, and ask this.
import type { Languages } from '../../settings/definitions/interest';
import type { LadderLang } from './ladders';

/** The ladders a choice of languages has, Greek first: none at English only. */
export const ladderLangsOf = (languages: Languages): LadderLang[] => {
  if (languages === 'both') return ['grc', 'hbo'];
  if (languages === 'greek') return ['grc'];
  return languages === 'hebrew' ? ['hbo'] : [];
};

/** The language whose ladder is in hand, or null at English only. A chapter's language counts only when he chose it. */
export function languageInHand({ chapter, languages, segment }: { chapter?: LadderLang; languages: Languages; segment: LadderLang }): LadderLang | null {
  const chosen = ladderLangsOf(languages);
  if (chosen.length === 0) return null;
  if (chapter && chosen.includes(chapter)) return chapter;
  return chosen.length === 1 ? chosen[0] : segment;
}
